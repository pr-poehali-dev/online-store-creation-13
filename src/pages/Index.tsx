import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import Icon from '@/components/ui/icon';

interface Product {
  id: number;
  name: string;
  price: number;
  image: string;
  category: string;
  featured?: boolean;
}

interface CartItem extends Product {
  quantity: number;
}

const Index = () => {
  const [currentPage, setCurrentPage] = useState<'home' | 'catalog' | 'portfolio' | 'blog' | 'about'>('home');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showCheckout, setShowCheckout] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [orderId, setOrderId] = useState<number | null>(null);
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    delivery_address: ''
  });

  const products: Product[] = [
    {
      id: 1,
      name: 'Neon Gaming Headset',
      price: 8990,
      image: 'https://cdn.poehali.dev/projects/2817f374-379b-46c0-a7ee-b3109eabbe2f/files/201e94fa-79b3-4c21-bd83-9970f2ad158d.jpg',
      category: 'audio',
      featured: true
    },
    {
      id: 2,
      name: 'RGB Mechanical Keyboard',
      price: 12490,
      image: 'https://cdn.poehali.dev/projects/2817f374-379b-46c0-a7ee-b3109eabbe2f/files/447d92f3-ab39-4e35-bfe1-8cd259bb1db3.jpg',
      category: 'peripherals',
      featured: true
    },
    {
      id: 3,
      name: 'Cyber Gaming Mouse',
      price: 6990,
      image: 'https://cdn.poehali.dev/projects/2817f374-379b-46c0-a7ee-b3109eabbe2f/files/b6975f3b-7d21-4d0b-84cf-e3663a24614f.jpg',
      category: 'peripherals',
      featured: true
    },
    {
      id: 4,
      name: 'Pro Gaming Monitor 27"',
      price: 24990,
      image: 'https://cdn.poehali.dev/projects/2817f374-379b-46c0-a7ee-b3109eabbe2f/files/201e94fa-79b3-4c21-bd83-9970f2ad158d.jpg',
      category: 'displays'
    },
    {
      id: 5,
      name: 'Stream Microphone',
      price: 15990,
      image: 'https://cdn.poehali.dev/projects/2817f374-379b-46c0-a7ee-b3109eabbe2f/files/447d92f3-ab39-4e35-bfe1-8cd259bb1db3.jpg',
      category: 'audio'
    },
    {
      id: 6,
      name: 'Gaming Chair Ultra',
      price: 34990,
      image: 'https://cdn.poehali.dev/projects/2817f374-379b-46c0-a7ee-b3109eabbe2f/files/b6975f3b-7d21-4d0b-84cf-e3663a24614f.jpg',
      category: 'furniture'
    }
  ];

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: number) => {
    setCart(prev => prev.filter(item => item.id !== productId));
  };

  const updateQuantity = (productId: number, delta: number) => {
    setCart(prev =>
      prev.map(item =>
        item.id === productId
          ? { ...item, quantity: Math.max(0, item.quantity + delta) }
          : item
      ).filter(item => item.quantity > 0)
    );
  };

  const totalPrice = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleCheckout = async () => {
    if (!formData.customer_name || !formData.customer_email || !formData.customer_phone || !formData.delivery_address) {
      toast({
        title: 'Ошибка',
        description: 'Заполните все поля',
        variant: 'destructive'
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('https://functions.poehali.dev/762bfbcb-bbe3-4f88-a9a1-50b1a332ac62', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          customer_name: formData.customer_name,
          customer_email: formData.customer_email,
          customer_phone: formData.customer_phone,
          delivery_address: formData.delivery_address,
          cart_items: cart.map(item => ({
            id: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity
          }))
        })
      });

      const data = await response.json();

      if (data.success) {
        setOrderId(data.order_id);
        setOrderSuccess(true);
        setShowCheckout(false);
        setCart([]);
        setFormData({
          customer_name: '',
          customer_email: '',
          customer_phone: '',
          delivery_address: ''
        });

        if (data.payment_url) {
          window.location.href = data.payment_url;
        } else {
          toast({
            title: 'Заказ оформлен!',
            description: `Номер заказа: #${data.order_id}. Мы свяжемся с вами для подтверждения.`
          });
        }
      } else {
        toast({
          title: 'Ошибка',
          description: data.error || 'Не удалось создать заказ',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Ошибка соединения с сервером',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredProducts = selectedCategory === 'all'
    ? products
    : products.filter(p => p.category === selectedCategory);

  const categories = ['all', 'audio', 'peripherals', 'displays', 'furniture'];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 backdrop-blur-lg bg-background/80 border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center animate-pulse-glow">
                <Icon name="Gamepad2" className="text-background" size={24} />
              </div>
              <h1 className="text-2xl font-black">CYBER<span className="text-primary">SHOP</span></h1>
            </div>

            <nav className="hidden md:flex gap-6">
              {(['home', 'catalog', 'portfolio', 'blog', 'about'] as const).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`text-sm font-semibold uppercase tracking-wider transition-all hover:text-primary relative
                    ${currentPage === page ? 'text-primary' : 'text-muted-foreground'}
                    ${currentPage === page ? 'after:absolute after:bottom-[-8px] after:left-0 after:w-full after:h-0.5 after:bg-primary after:animate-scale-in' : ''}`}
                >
                  {page}
                </button>
              ))}
            </nav>

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="relative">
                  <Icon name="ShoppingCart" size={20} />
                  {totalItems > 0 && (
                    <span className="absolute -top-2 -right-2 w-5 h-5 bg-secondary text-background rounded-full text-xs flex items-center justify-center font-bold animate-scale-in">
                      {totalItems}
                    </span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent className="w-full sm:max-w-md">
                <SheetHeader>
                  <SheetTitle className="text-2xl font-bold">Корзина</SheetTitle>
                </SheetHeader>
                <div className="mt-6 space-y-4">
                  {cart.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Icon name="ShoppingBag" size={48} className="mx-auto mb-4 opacity-50" />
                      <p>Корзина пуста</p>
                    </div>
                  ) : (
                    <>
                      {cart.map(item => (
                        <div key={item.id} className="flex gap-4 p-3 rounded-lg bg-card border border-border">
                          <img src={item.image} alt={item.name} className="w-20 h-20 object-cover rounded-md" />
                          <div className="flex-1">
                            <h4 className="font-semibold text-sm">{item.name}</h4>
                            <p className="text-primary font-bold">{item.price.toLocaleString()} ₽</p>
                            <div className="flex items-center gap-2 mt-2">
                              <Button
                                size="icon"
                                variant="outline"
                                className="h-7 w-7"
                                onClick={() => updateQuantity(item.id, -1)}
                              >
                                <Icon name="Minus" size={14} />
                              </Button>
                              <span className="font-semibold w-8 text-center">{item.quantity}</span>
                              <Button
                                size="icon"
                                variant="outline"
                                className="h-7 w-7"
                                onClick={() => updateQuantity(item.id, 1)}
                              >
                                <Icon name="Plus" size={14} />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 ml-auto"
                                onClick={() => removeFromCart(item.id)}
                              >
                                <Icon name="Trash2" size={14} />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                      <div className="border-t border-border pt-4 mt-4">
                        <div className="flex justify-between items-center mb-4">
                          <span className="text-lg font-semibold">Итого:</span>
                          <span className="text-2xl font-black text-primary">{totalPrice.toLocaleString()} ₽</span>
                        </div>
                        <Button 
                          onClick={() => setShowCheckout(true)}
                          className="w-full clip-slant bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-opacity font-bold text-lg py-6"
                        >
                          Оформить заказ
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {currentPage === 'home' && (
        <div>
          <section className="relative py-20 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-secondary/20"></div>
            <div className="container mx-auto px-4 relative z-10">
              <div className="max-w-3xl mx-auto text-center animate-fade-in">
                <Badge className="mb-4 text-sm px-4 py-2 bg-primary/20 border-primary animate-pulse-glow">
                  🎮 Новое поколение
                </Badge>
                <h2 className="text-5xl md:text-7xl font-black mb-6 leading-tight">
                  ИГРОВОЙ МИР<br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-secondary to-accent">
                    ТВОЕЙ МЕЧТЫ
                  </span>
                </h2>
                <p className="text-xl text-muted-foreground mb-8">
                  Самые крутые девайсы для настоящих геймеров
                </p>
                <div className="flex gap-4 justify-center flex-wrap">
                  <Button
                    onClick={() => setCurrentPage('catalog')}
                    size="lg"
                    className="clip-slant bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-opacity font-bold text-lg px-8"
                  >
                    <Icon name="Zap" size={20} className="mr-2" />
                    В каталог
                  </Button>
                  <Button
                    onClick={() => setCurrentPage('about')}
                    size="lg"
                    variant="outline"
                    className="font-bold text-lg px-8"
                  >
                    О магазине
                  </Button>
                </div>
              </div>
            </div>
          </section>

          <section className="py-16 bg-card/30">
            <div className="container mx-auto px-4">
              <h3 className="text-3xl font-black mb-8 text-center">
                ⚡ <span className="text-primary">ХИТЫ</span> ПРОДАЖ
              </h3>
              <div className="grid md:grid-cols-3 gap-6">
                {products.filter(p => p.featured).map((product, idx) => (
                  <Card
                    key={product.id}
                    className="group overflow-hidden bg-card border-border hover:border-primary transition-all duration-300 animate-fade-in"
                    style={{ animationDelay: `${idx * 100}ms` }}
                  >
                    <div className="relative overflow-hidden">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-64 object-cover transition-transform duration-300 group-hover:scale-110"
                      />
                      <Badge className="absolute top-4 right-4 bg-secondary/90 text-background">
                        NEW
                      </Badge>
                    </div>
                    <div className="p-6">
                      <h4 className="font-bold text-lg mb-2">{product.name}</h4>
                      <p className="text-2xl font-black text-primary mb-4">
                        {product.price.toLocaleString()} ₽
                      </p>
                      <Button
                        onClick={() => addToCart(product)}
                        className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-opacity font-semibold"
                      >
                        <Icon name="ShoppingCart" size={16} className="mr-2" />
                        В корзину
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </section>
        </div>
      )}

      {currentPage === 'catalog' && (
        <div className="py-12">
          <div className="container mx-auto px-4">
            <h2 className="text-4xl font-black mb-8">
              📦 <span className="text-primary">КАТАЛОГ</span> ТОВАРОВ
            </h2>

            <div className="flex gap-3 mb-8 flex-wrap">
              {categories.map(cat => (
                <Button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  variant={selectedCategory === cat ? 'default' : 'outline'}
                  className={selectedCategory === cat ? 'bg-primary' : ''}
                >
                  {cat === 'all' ? 'Все' : cat}
                </Button>
              ))}
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {filteredProducts.map((product, idx) => (
                <Card
                  key={product.id}
                  className="group overflow-hidden bg-card border-border hover:border-primary transition-all duration-300 animate-fade-in"
                  style={{ animationDelay: `${idx * 100}ms` }}
                >
                  <div className="relative overflow-hidden">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-64 object-cover transition-transform duration-300 group-hover:scale-110"
                    />
                  </div>
                  <div className="p-6">
                    <Badge className="mb-2 text-xs">{product.category}</Badge>
                    <h4 className="font-bold text-lg mb-2">{product.name}</h4>
                    <p className="text-2xl font-black text-primary mb-4">
                      {product.price.toLocaleString()} ₽
                    </p>
                    <Button
                      onClick={() => addToCart(product)}
                      className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-opacity font-semibold"
                    >
                      <Icon name="ShoppingCart" size={16} className="mr-2" />
                      В корзину
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}

      {currentPage === 'portfolio' && (
        <div className="py-12">
          <div className="container mx-auto px-4 max-w-4xl">
            <h2 className="text-4xl font-black mb-8">
              🎨 <span className="text-primary">ПОРТФОЛИО</span>
            </h2>
            <div className="space-y-8">
              <Card className="p-8 bg-card border-border">
                <h3 className="text-2xl font-bold mb-4 text-primary">Проект "Cyber Arena"</h3>
                <p className="text-muted-foreground mb-4">
                  Комплексное оснащение киберспортивной арены на 50 мест. Поставка игровых станций, периферии и системы освещения.
                </p>
                <Badge>Завершён</Badge>
              </Card>
              <Card className="p-8 bg-card border-border">
                <h3 className="text-2xl font-bold mb-4 text-primary">Турнир "Neon Masters"</h3>
                <p className="text-muted-foreground mb-4">
                  Спонсорская поддержка крупнейшего регионального турнира. Призовой фонд в игровой технике.
                </p>
                <Badge>В процессе</Badge>
              </Card>
            </div>
          </div>
        </div>
      )}

      {currentPage === 'blog' && (
        <div className="py-12">
          <div className="container mx-auto px-4 max-w-4xl">
            <h2 className="text-4xl font-black mb-8">
              📰 <span className="text-primary">БЛОГ</span>
            </h2>
            <div className="space-y-6">
              {[
                {
                  title: 'Топ-5 игровых мышей 2024 года',
                  date: '15 января 2024',
                  excerpt: 'Разбираем лучшие модели для профессиональных геймеров и любителей.'
                },
                {
                  title: 'Как выбрать игровой монитор?',
                  date: '10 января 2024',
                  excerpt: 'Частота обновления, время отклика, разрешение — всё, что нужно знать.'
                },
                {
                  title: 'Механические клавиатуры: гид по свичам',
                  date: '5 января 2024',
                  excerpt: 'Red, Blue, Brown — какие переключатели подходят именно вам?'
                }
              ].map((post, idx) => (
                <Card key={idx} className="p-6 bg-card border-border hover:border-primary transition-all cursor-pointer">
                  <h3 className="text-xl font-bold mb-2">{post.title}</h3>
                  <p className="text-sm text-muted-foreground mb-3">{post.date}</p>
                  <p className="text-muted-foreground">{post.excerpt}</p>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}

      {currentPage === 'about' && (
        <div className="py-12">
          <div className="container mx-auto px-4 max-w-4xl">
            <h2 className="text-4xl font-black mb-8">
              ℹ️ <span className="text-primary">О МАГАЗИНЕ</span>
            </h2>
            <Card className="p-8 bg-card border-border">
              <div className="space-y-6">
                <div>
                  <h3 className="text-2xl font-bold mb-3 text-primary">Кто мы?</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    CyberShop — это команда энтузиастов, влюблённых в игровой мир. Мы отбираем только лучшие девайсы
                    и предлагаем их по честным ценам с гарантией качества.
                  </p>
                </div>
                <div>
                  <h3 className="text-2xl font-bold mb-3 text-primary">Наши преимущества</h3>
                  <ul className="space-y-2 text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <Icon name="CheckCircle2" className="text-primary mt-1" size={20} />
                      <span>Только оригинальная продукция от производителей</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Icon name="CheckCircle2" className="text-primary mt-1" size={20} />
                      <span>Быстрая доставка по всей России</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Icon name="CheckCircle2" className="text-primary mt-1" size={20} />
                      <span>Гарантия на всю технику от 1 года</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Icon name="CheckCircle2" className="text-primary mt-1" size={20} />
                      <span>Техподдержка 24/7</span>
                    </li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-2xl font-bold mb-3 text-primary">Контакты</h3>
                  <div className="space-y-2 text-muted-foreground">
                    <p className="flex items-center gap-2">
                      <Icon name="Mail" size={18} />
                      support@cybershop.ru
                    </p>
                    <p className="flex items-center gap-2">
                      <Icon name="Phone" size={18} />
                      +7 (800) 555-35-35
                    </p>
                    <p className="flex items-center gap-2">
                      <Icon name="MapPin" size={18} />
                      Москва, ул. Геймерская, 1
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      <Dialog open={showCheckout} onOpenChange={setShowCheckout}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Оформление заказа</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="name">Ваше имя *</Label>
              <Input
                id="name"
                value={formData.customer_name}
                onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                placeholder="Иван Иванов"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.customer_email}
                onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
                placeholder="ivan@example.com"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="phone">Телефон *</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.customer_phone}
                onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                placeholder="+7 (900) 123-45-67"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="address">Адрес доставки *</Label>
              <Textarea
                id="address"
                value={formData.delivery_address}
                onChange={(e) => setFormData({ ...formData, delivery_address: e.target.value })}
                placeholder="Город, улица, дом, квартира"
                className="mt-1"
                rows={3}
              />
            </div>
            <div className="border-t pt-4 flex justify-between items-center">
              <span className="text-lg font-semibold">Итого:</span>
              <span className="text-2xl font-black text-primary">{totalPrice.toLocaleString()} ₽</span>
            </div>
            <Button
              onClick={handleCheckout}
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-opacity font-bold text-lg py-6"
            >
              {isSubmitting ? 'Обработка...' : 'Подтвердить заказ'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={orderSuccess} onOpenChange={setOrderSuccess}>
        <DialogContent className="sm:max-w-md text-center">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-primary">Заказ оформлен! 🎉</DialogTitle>
          </DialogHeader>
          <div className="py-6">
            <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Icon name="CheckCircle2" size={32} className="text-primary" />
            </div>
            <p className="text-lg mb-2">Номер заказа: <span className="font-bold">#{orderId}</span></p>
            <p className="text-muted-foreground">Мы свяжемся с вами для подтверждения доставки</p>
          </div>
          <Button onClick={() => setOrderSuccess(false)} className="w-full">
            Продолжить покупки
          </Button>
        </DialogContent>
      </Dialog>

      <footer className="bg-card/50 border-t border-border py-8 mt-20">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p className="mb-2">© 2024 CyberShop. Все права защищены.</p>
          <div className="flex gap-4 justify-center">
            <Icon name="Instagram" size={20} className="cursor-pointer hover:text-primary transition-colors" />
            <Icon name="Twitter" size={20} className="cursor-pointer hover:text-primary transition-colors" />
            <Icon name="Youtube" size={20} className="cursor-pointer hover:text-primary transition-colors" />
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;