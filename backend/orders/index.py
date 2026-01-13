import json
import os
import psycopg2
from datetime import datetime

def handler(event: dict, context) -> dict:
    """API для создания и получения заказов в интернет-магазине"""
    method = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    dsn = os.environ.get('DATABASE_URL')
    schema = os.environ.get('MAIN_DB_SCHEMA', 'public')
    
    try:
        conn = psycopg2.connect(dsn)
        conn.set_session(autocommit=True)
        cur = conn.cursor()
        
        if method == 'POST':
            body = json.loads(event.get('body', '{}'))
            
            customer_name = body.get('customer_name', '').strip()
            customer_email = body.get('customer_email', '').strip()
            customer_phone = body.get('customer_phone', '').strip()
            delivery_address = body.get('delivery_address', '').strip()
            cart_items = body.get('cart_items', [])
            
            if not all([customer_name, customer_email, customer_phone, delivery_address]):
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Заполните все обязательные поля'}),
                    'isBase64Encoded': False
                }
            
            if not cart_items or len(cart_items) == 0:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Корзина пуста'}),
                    'isBase64Encoded': False
                }
            
            total_amount = sum(item['price'] * item['quantity'] for item in cart_items)
            
            cur.execute(
                f"""
                INSERT INTO {schema}.orders 
                (customer_name, customer_email, customer_phone, delivery_address, total_amount, status)
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING id
                """,
                (customer_name, customer_email, customer_phone, delivery_address, total_amount, 'pending')
            )
            
            order_id = cur.fetchone()[0]
            
            for item in cart_items:
                cur.execute(
                    f"""
                    INSERT INTO {schema}.order_items
                    (order_id, product_id, product_name, product_price, quantity)
                    VALUES (%s, %s, %s, %s, %s)
                    """,
                    (order_id, item['id'], item['name'], item['price'], item['quantity'])
                )
            
            yookassa_shop_id = os.environ.get('YOOKASSA_SHOP_ID')
            yookassa_secret = os.environ.get('YOOKASSA_SECRET_KEY')
            
            payment_url = None
            if yookassa_shop_id and yookassa_secret:
                try:
                    import requests
                    import uuid
                    
                    idempotence_key = str(uuid.uuid4())
                    
                    payment_data = {
                        'amount': {
                            'value': f'{total_amount}.00',
                            'currency': 'RUB'
                        },
                        'confirmation': {
                            'type': 'redirect',
                            'return_url': f'https://functions.poehali.dev/success?order_id={order_id}'
                        },
                        'capture': True,
                        'description': f'Заказ #{order_id} в CyberShop'
                    }
                    
                    response = requests.post(
                        'https://api.yookassa.ru/v3/payments',
                        json=payment_data,
                        auth=(yookassa_shop_id, yookassa_secret),
                        headers={'Idempotence-Key': idempotence_key}
                    )
                    
                    if response.status_code == 200:
                        payment_info = response.json()
                        payment_url = payment_info['confirmation']['confirmation_url']
                        payment_id = payment_info['id']
                        
                        cur.execute(
                            f"UPDATE {schema}.orders SET payment_id = %s WHERE id = %s",
                            (payment_id, order_id)
                        )
                except Exception as e:
                    pass
            
            cur.close()
            conn.close()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({
                    'success': True,
                    'order_id': order_id,
                    'total_amount': total_amount,
                    'payment_url': payment_url,
                    'message': 'Заказ успешно создан!'
                }),
                'isBase64Encoded': False
            }
        
        elif method == 'GET':
            query_params = event.get('queryStringParameters') or {}
            order_id = query_params.get('order_id')
            
            if order_id:
                cur.execute(
                    f"""
                    SELECT id, customer_name, customer_email, customer_phone, 
                           delivery_address, total_amount, status, created_at
                    FROM {schema}.orders 
                    WHERE id = %s
                    """,
                    (order_id,)
                )
                
                row = cur.fetchone()
                if not row:
                    return {
                        'statusCode': 404,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'Заказ не найден'}),
                        'isBase64Encoded': False
                    }
                
                order = {
                    'id': row[0],
                    'customer_name': row[1],
                    'customer_email': row[2],
                    'customer_phone': row[3],
                    'delivery_address': row[4],
                    'total_amount': row[5],
                    'status': row[6],
                    'created_at': row[7].isoformat() if row[7] else None
                }
                
                cur.execute(
                    f"""
                    SELECT product_id, product_name, product_price, quantity
                    FROM {schema}.order_items
                    WHERE order_id = %s
                    """,
                    (order_id,)
                )
                
                items = []
                for item_row in cur.fetchall():
                    items.append({
                        'product_id': item_row[0],
                        'product_name': item_row[1],
                        'product_price': item_row[2],
                        'quantity': item_row[3]
                    })
                
                order['items'] = items
                
                cur.close()
                conn.close()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps(order),
                    'isBase64Encoded': False
                }
            else:
                cur.execute(
                    f"""
                    SELECT id, customer_name, total_amount, status, created_at
                    FROM {schema}.orders
                    ORDER BY created_at DESC
                    LIMIT 50
                    """
                )
                
                orders = []
                for row in cur.fetchall():
                    orders.append({
                        'id': row[0],
                        'customer_name': row[1],
                        'total_amount': row[2],
                        'status': row[3],
                        'created_at': row[4].isoformat() if row[4] else None
                    })
                
                cur.close()
                conn.close()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'orders': orders}),
                    'isBase64Encoded': False
                }
        
        else:
            return {
                'statusCode': 405,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Метод не поддерживается'}),
                'isBase64Encoded': False
            }
    
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': f'Ошибка сервера: {str(e)}'}),
            'isBase64Encoded': False
        }
