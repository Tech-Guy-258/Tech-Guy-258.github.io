/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Menu, 
  X, 
  ChevronRight, 
  Package, 
  Truck, 
  Headphones, 
  Mail, 
  Phone, 
  MapPin, 
  Instagram, 
  Linkedin, 
  Facebook,
  Award,
  Users,
  Briefcase,
  CheckCircle2
} from 'lucide-react';

const Navbar = ({ onNavigate, currentPage }: { onNavigate: (page: string) => void, currentPage: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Início', href: '#home', type: 'anchor' },
    { name: 'Sobre Nós', href: '#about', type: 'anchor' },
    { name: 'Serviços', href: '#services', type: 'anchor' },
    { name: 'Clientes', href: '#clients', type: 'anchor' },
    { name: 'Contacto', href: '#contact', type: 'anchor' },
  ];

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string, type: string) => {
    if (currentPage !== 'home' && type === 'anchor') {
      e.preventDefault();
      onNavigate('home');
      // Small delay to allow home to render before scrolling
      setTimeout(() => {
        const element = document.querySelector(href);
        element?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  };

  return (
    <nav className={`fixed w-full z-50 transition-all duration-300 ${scrolled || currentPage !== 'home' ? 'bg-white shadow-md py-3' : 'bg-transparent py-5'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          <div className="flex-shrink-0 flex items-center cursor-pointer" onClick={() => onNavigate('home')}>
            <span className={`text-3xl font-bold tracking-tighter ${scrolled || currentPage !== 'home' ? 'text-diva-blue' : 'text-white'}`}>
              <span className="text-diva-gold">d</span>iva
            </span>
          </div>
          
          {/* Desktop Nav */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-8">
              {navLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  onClick={(e) => handleLinkClick(e, link.href, link.type)}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    scrolled || currentPage !== 'home' ? 'text-diva-blue hover:text-diva-gold' : 'text-white hover:text-diva-gold'
                  }`}
                >
                  {link.name}
                </a>
              ))}
              <button 
                onClick={() => onNavigate('quote')}
                className="bg-diva-gold text-diva-blue px-6 py-2 rounded-full font-semibold hover:bg-diva-blue hover:text-white transition-all duration-300 shadow-lg"
              >
                Orçamento
              </button>
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className={`inline-flex items-center justify-center p-2 rounded-md ${scrolled || currentPage !== 'home' ? 'text-diva-blue' : 'text-white'}`}
            >
              {isOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Nav */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-b border-gray-100"
          >
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              {navLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  onClick={(e) => {
                    handleLinkClick(e, link.href, link.type);
                    setIsOpen(false);
                  }}
                  className="block px-3 py-4 text-base font-medium text-diva-blue hover:bg-gray-50 hover:text-diva-gold"
                >
                  {link.name}
                </a>
              ))}
              <div className="px-3 py-4">
                <button 
                  onClick={() => {
                    onNavigate('quote');
                    setIsOpen(false);
                  }}
                  className="w-full bg-diva-blue text-white px-6 py-3 rounded-xl font-semibold"
                >
                  Pedir Orçamento
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

const Hero = ({ onNavigate }: { onNavigate: (page: string) => void }) => {
  return (
    <section id="home" className="relative h-screen flex items-center overflow-hidden">
      {/* Background with Overlay */}
      <div className="absolute inset-0 z-0">
        <img 
          src="https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=2000" 
          alt="Office Background" 
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-diva-blue/80 mix-blend-multiply"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-3xl"
        >
          <h1 className="text-5xl md:text-7xl font-bold text-white leading-tight mb-6">
            Excelência em <span className="text-diva-gold italic">Soluções</span> para o seu Escritório.
          </h1>
          <p className="text-xl text-gray-200 mb-10 leading-relaxed">
            A Diva oferece o que há de melhor em material de escritório, mobiliário e tecnologia para transformar o seu ambiente de trabalho em um espaço de alta produtividade.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <button 
              onClick={() => onNavigate('quote')}
              className="bg-diva-gold text-diva-blue px-8 py-4 rounded-full font-bold text-lg flex items-center justify-center hover:bg-white transition-all group"
            >
              Pedir Orçamento <ChevronRight className="ml-2 group-hover:translate-x-1 transition-transform" />
            </button>
            <button 
              onClick={() => {
                const element = document.querySelector('#contact');
                element?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="border-2 border-white text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-white hover:text-diva-blue transition-all"
            >
              Falar com Especialista
            </button>
          </div>
        </motion.div>
      </div>

      {/* Decorative element */}
      <div className="absolute bottom-0 right-0 w-1/3 h-1/3 bg-diva-gold/10 blur-3xl rounded-full -mb-20 -mr-20"></div>
    </section>
  );
};

const Partners = () => {
  const partners = [
    "HP", "Faber-Castell", "Bic", "3M", "Xerox", "Canon"
  ];

  return (
    <section className="py-12 bg-gray-50 border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <p className="text-center text-sm font-semibold text-gray-400 uppercase tracking-widest mb-8">
          Nossos Parceiros Estratégicos
        </p>
        <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
          {partners.map((partner) => (
            <span key={partner} className="text-2xl md:text-3xl font-bold text-diva-blue">
              {partner}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
};

const About = () => {
  return (
    <section id="about" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-block px-4 py-1 rounded-full bg-diva-gold/10 text-diva-gold font-bold text-sm mb-4">
              SOBRE A DIVA
            </div>
            <h2 className="text-4xl font-bold text-diva-blue mb-6">
              Mais de 10 anos transformando espaços de trabalho.
            </h2>
            <p className="text-gray-600 text-lg mb-8 leading-relaxed">
              Fundada com a missão de simplificar o dia a dia corporativo, a Diva tornou-se referência no fornecimento de materiais de escritório de alta qualidade. Não vendemos apenas produtos; entregamos eficiência e organização.
            </p>
            <div className="grid grid-cols-2 gap-6 mb-8">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="text-diva-gold flex-shrink-0" />
                <div>
                  <h4 className="font-bold text-diva-blue">Qualidade Premium</h4>
                  <p className="text-sm text-gray-500">Apenas as melhores marcas.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="text-diva-gold flex-shrink-0" />
                <div>
                  <h4 className="font-bold text-diva-blue">Entrega Ágil</h4>
                  <p className="text-sm text-gray-500">Logística própria eficiente.</p>
                </div>
              </div>
            </div>
            <button className="text-diva-blue font-bold flex items-center group">
              Conheça nossa história <ChevronRight className="ml-1 group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative"
          >
            <div className="aspect-square rounded-3xl overflow-hidden shadow-2xl">
              <img 
                src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&q=80&w=1000" 
                alt="Team working" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="absolute -bottom-10 -left-10 bg-diva-blue p-8 rounded-2xl shadow-xl hidden lg:block">
              <div className="text-4xl font-bold text-diva-gold mb-1">15k+</div>
              <div className="text-white text-sm font-medium">Clientes Satisfeitos</div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

const Services = () => {
  const services = [
    {
      title: "Suprimentos de Escritório",
      description: "Papelaria completa, desde itens básicos até materiais técnicos especializados.",
      icon: <Package className="w-8 h-8" />,
    },
    {
      title: "Mobiliário Corporativo",
      description: "Ergonomia e design para criar ambientes que inspiram criatividade e conforto.",
      icon: <Briefcase className="w-8 h-8" />,
    },
    {
      title: "Tecnologia & TI",
      description: "Equipamentos de informática, periféricos e soluções de impressão.",
      icon: <Award className="w-8 h-8" />,
    },
    {
      title: "Logística Personalizada",
      description: "Entregas programadas e gestão de estoque para grandes corporações.",
      icon: <Truck className="w-8 h-8" />,
    },
    {
      title: "Consultoria de Espaço",
      description: "Ajudamos a planejar o seu escritório para máxima eficiência operacional.",
      icon: <Users className="w-8 h-8" />,
    },
    {
      title: "Suporte Dedicado",
      description: "Atendimento exclusivo para garantir que nada falte no seu dia a dia.",
      icon: <Headphones className="w-8 h-8" />,
    },
  ];

  return (
    <section id="services" className="py-24 bg-diva-blue text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <h2 className="text-4xl font-bold mb-6">Nossos Serviços Prestados</h2>
          <p className="text-gray-300 text-lg">
            Oferecemos uma gama completa de soluções integradas para que você possa focar no que realmente importa: o seu negócio.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {services.map((service, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="bg-diva-blue-dark p-10 rounded-3xl border border-white/5 hover:border-diva-gold/30 transition-all group"
            >
              <div className="text-diva-gold mb-6 group-hover:scale-110 transition-transform duration-300">
                {service.icon}
              </div>
              <h3 className="text-xl font-bold mb-4">{service.title}</h3>
              <p className="text-gray-400 leading-relaxed">
                {service.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

const Clients = () => {
  const testimonials = [
    {
      name: "Ricardo Santos",
      role: "Diretor de Operações, TechFlow",
      content: "A Diva é nossa parceira há 5 anos. A agilidade na entrega e a qualidade dos materiais são impecáveis.",
      image: "https://i.pravatar.cc/150?u=1"
    },
    {
      name: "Ana Oliveira",
      role: "Gerente de RH, Global Solutions",
      content: "O mobiliário ergonômico da Diva mudou a dinâmica do nosso escritório. Nossos colaboradores estão muito mais satisfeitos.",
      image: "https://i.pravatar.cc/150?u=2"
    },
    {
      name: "Carlos Mendes",
      role: "CEO, Innovate Hub",
      content: "Excelente atendimento. Sempre encontram soluções personalizadas para nossas necessidades específicas.",
      image: "https://i.pravatar.cc/150?u=3"
    }
  ];

  return (
    <section id="clients" className="py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
          <div className="max-w-2xl">
            <div className="inline-block px-4 py-1 rounded-full bg-diva-gold/10 text-diva-gold font-bold text-sm mb-4">
              CLIENTES
            </div>
            <h2 className="text-4xl font-bold text-diva-blue">
              O que dizem quem confia no nosso trabalho.
            </h2>
          </div>
          <div className="flex gap-4">
            <div className="w-12 h-12 rounded-full border border-gray-200 flex items-center justify-center cursor-pointer hover:bg-diva-blue hover:text-white transition-all">
              <ChevronRight className="rotate-180" />
            </div>
            <div className="w-12 h-12 rounded-full border border-gray-200 flex items-center justify-center cursor-pointer hover:bg-diva-blue hover:text-white transition-all">
              <ChevronRight />
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((t, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100"
            >
              <div className="flex gap-1 text-diva-gold mb-6">
                {[...Array(5)].map((_, star) => (
                  <CheckCircle2 key={star} size={16} fill="currentColor" />
                ))}
              </div>
              <p className="text-gray-600 italic mb-8">"{t.content}"</p>
              <div className="flex items-center gap-4">
                <img src={t.image} alt={t.name} className="w-12 h-12 rounded-full object-cover" referrerPolicy="no-referrer" />
                <div>
                  <h4 className="font-bold text-diva-blue">{t.name}</h4>
                  <p className="text-xs text-gray-400">{t.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

const Contact = () => {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(false);

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name'),
      company: formData.get('company'),
      email: formData.get('email'),
      phone: 'N/A', // Not in the contact form but required by API
      categories: ['Contacto Geral'],
      description: formData.get('message'),
      urgency: 'Média',
      source: 'Site - Formulário Contacto',
    };

    try {
      const response = await fetch('/api/quote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        setSubmitted(true);
      } else {
        throw new Error('Failed to send message');
      }
    } catch (err) {
      console.error('Error sending message:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="contact" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-diva-blue rounded-[3rem] overflow-hidden shadow-2xl">
          <div className="grid md:grid-cols-2">
            <div className="p-12 md:p-20 text-white">
              <h2 className="text-4xl font-bold mb-8">Vamos conversar?</h2>
              <p className="text-gray-300 mb-12 text-lg">
                Estamos prontos para atender as necessidades do seu negócio. Entre em contacto e peça um orçamento personalizado.
              </p>
              
              <div className="space-y-8">
                <div className="flex items-center gap-6">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-diva-gold">
                    <Phone size={24} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Telefone</p>
                    <p className="font-bold text-lg">+258 86 054 3336</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-diva-gold">
                    <Mail size={24} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Email</p>
                    <p className="font-bold text-lg">comercial@diva.co.mz</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-diva-gold">
                    <MapPin size={24} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Localização</p>
                    <p className="font-bold text-lg">Maputo, Mocambique Av. Amilcar Cabral, Nr 48, 1o andar )</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-12 md:p-20">
              {submitted ? (
                <div className="h-full flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6">
                    <CheckCircle2 size={32} />
                  </div>
                  <h3 className="text-2xl font-bold text-diva-blue mb-2">Mensagem Enviada!</h3>
                  <p className="text-gray-500">Obrigado pelo seu contacto. Responderemos em breve.</p>
                  <button 
                    onClick={() => setSubmitted(false)}
                    className="mt-8 text-diva-blue font-bold hover:underline"
                  >
                    Enviar outra mensagem
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-bold text-diva-blue mb-2">Nome</label>
                      <input required name="name" type="text" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-diva-gold focus:ring-1 focus:ring-diva-gold outline-none transition-all" placeholder="Seu nome" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-diva-blue mb-2">Empresa</label>
                      <input required name="company" type="text" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-diva-gold focus:ring-1 focus:ring-diva-gold outline-none transition-all" placeholder="Nome da empresa" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-diva-blue mb-2">Email Corporativo</label>
                    <input required name="email" type="email" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-diva-gold focus:ring-1 focus:ring-diva-gold outline-none transition-all" placeholder="email@empresa.com" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-diva-blue mb-2">Mensagem</label>
                    <textarea required name="message" rows={4} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-diva-gold focus:ring-1 focus:ring-diva-gold outline-none transition-all" placeholder="Como podemos ajudar?"></textarea>
                  </div>
                  
                  {error && (
                    <p className="text-red-500 text-sm font-medium">Erro ao enviar mensagem. Tente novamente.</p>
                  )}

                  <button 
                    type="submit"
                    disabled={loading}
                    className={`w-full bg-diva-blue text-white py-4 rounded-xl font-bold text-lg hover:bg-diva-blue-dark transition-all shadow-lg ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                  >
                    {loading ? 'Enviando...' : 'Enviar Mensagem'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const Footer = () => {
  return (
    <footer className="bg-gray-50 pt-20 pb-10 border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-12 mb-16">
          <div className="col-span-1 md:col-span-1">
            <span className="text-3xl font-bold tracking-tighter text-diva-blue mb-6 block">
              <span className="text-diva-gold">d</span>iva
            </span>
            <p className="text-gray-500 mb-6">
              Soluções completas para escritórios modernos. Qualidade, agilidade e compromisso com o seu sucesso.
            </p>
            <div className="flex gap-4">
              <a href="#" className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-diva-blue hover:bg-diva-blue hover:text-white transition-all">
                <Instagram size={18} />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-diva-blue hover:bg-diva-blue hover:text-white transition-all">
                <Linkedin size={18} />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-diva-blue hover:bg-diva-blue hover:text-white transition-all">
                <Facebook size={18} />
              </a>
            </div>
          </div>
          
          <div>
            <h4 className="font-bold text-diva-blue mb-6">Links Rápidos</h4>
            <ul className="space-y-4 text-gray-500">
              <li><a href="#home" className="hover:text-diva-gold transition-colors">Início</a></li>
              <li><a href="#about" className="hover:text-diva-gold transition-colors">Sobre Nós</a></li>
              <li><a href="#services" className="hover:text-diva-gold transition-colors">Serviços</a></li>
              <li><a href="#contact" className="hover:text-diva-gold transition-colors">Contacto</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-diva-blue mb-6">Serviços</h4>
            <ul className="space-y-4 text-gray-500">
              <li><a href="#" className="hover:text-diva-gold transition-colors">Material de Escritório</a></li>
              <li><a href="#" className="hover:text-diva-gold transition-colors">Mobiliário</a></li>
              <li><a href="#" className="hover:text-diva-gold transition-colors">Informática</a></li>
              <li><a href="#" className="hover:text-diva-gold transition-colors">Gestão de Estoque</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-diva-blue mb-6">Newsletter</h4>
            <p className="text-gray-500 mb-4 text-sm">Receba novidades e ofertas exclusivas no seu email.</p>
            <div className="flex gap-2">
              <input type="email" placeholder="Seu email" className="bg-white border border-gray-200 px-4 py-2 rounded-lg outline-none focus:border-diva-gold w-full" />
              <button className="bg-diva-blue text-white px-4 py-2 rounded-lg font-bold">OK</button>
            </div>
          </div>
        </div>
        
        <div className="pt-8 border-t border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-400">
          <p>© 2024 Diva Material de Escritório. Todos os direitos reservados.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-diva-blue">Privacidade</a>
            <a href="#" className="hover:text-diva-blue">Termos de Uso</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

const QuotePage = () => {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(false);

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name'),
      company: formData.get('company'),
      email: formData.get('email'),
      phone: formData.get('phone'),
      categories: Array.from(formData.getAll('categories')),
      description: formData.get('description'),
      urgency: formData.get('urgency'),
      source: formData.get('source'),
    };

    try {
      const response = await fetch('/api/quote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        setSubmitted(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        throw new Error('Failed to send quote');
      }
    } catch (err) {
      console.error('Error sending quote:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="pt-32 pb-24 min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white p-12 rounded-[3rem] shadow-xl text-center border border-gray-100"
        >
          <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-8">
            <CheckCircle2 size={40} />
          </div>
          <h2 className="text-3xl font-bold text-diva-blue mb-4">Solicitação Enviada!</h2>
          <p className="text-gray-500 mb-10 leading-relaxed">
            Recebemos o seu pedido de orçamento. Nossa equipe comercial entrará em contacto em até 24 horas úteis.
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="w-full bg-diva-blue text-white py-4 rounded-xl font-bold hover:bg-diva-blue-dark transition-all"
          >
            Voltar ao Início
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="pt-32 pb-24 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-block px-4 py-1 rounded-full bg-diva-gold/10 text-diva-gold font-bold text-sm mb-4">
            ORÇAMENTO PERSONALIZADO
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-diva-blue mb-6">Solicite sua Cotação</h1>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto">
            Preencha o formulário abaixo com os detalhes do que você precisa e nossa equipe preparará a melhor proposta para o seu negócio.
          </p>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[3rem] shadow-xl overflow-hidden border border-gray-100"
        >
          <form onSubmit={handleSubmit} className="p-8 md:p-16 space-y-10">
            {/* Section 1: Contact Info */}
            <div>
              <h3 className="text-xl font-bold text-diva-blue mb-6 flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-diva-blue text-white flex items-center justify-center text-sm">01</span>
                Informações de Contacto
              </h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-diva-blue mb-2">Nome Completo *</label>
                  <input required name="name" type="text" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-diva-gold focus:ring-1 focus:ring-diva-gold outline-none transition-all" placeholder="Ex: João Silva" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-diva-blue mb-2">Nome da Empresa *</label>
                  <input required name="company" type="text" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-diva-gold focus:ring-1 focus:ring-diva-gold outline-none transition-all" placeholder="Diva Lda" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-diva-blue mb-2">Email Corporativo *</label>
                  <input required name="email" type="email" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-diva-gold focus:ring-1 focus:ring-diva-gold outline-none transition-all" placeholder="email@empresa.com" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-diva-blue mb-2">Telefone / WhatsApp *</label>
                  <input required name="phone" type="tel" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-diva-gold focus:ring-1 focus:ring-diva-gold outline-none transition-all" placeholder="+258 ..." />
                </div>
              </div>
            </div>

            <hr className="border-gray-100" />

            {/* Section 2: Order Details */}
            <div>
              <h3 className="text-xl font-bold text-diva-blue mb-6 flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-diva-blue text-white flex items-center justify-center text-sm">02</span>
                Detalhes do Pedido
              </h3>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-diva-blue mb-4">Categorias de Interesse</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {['Papelaria', 'Mobiliário', 'Informática', 'Limpeza', 'Copa/Café', 'Outros'].map((cat) => (
                      <label key={cat} className="flex items-center gap-3 p-4 rounded-xl border border-gray-100 hover:border-diva-gold cursor-pointer transition-all group">
                        <input name="categories" value={cat} type="checkbox" className="w-5 h-5 rounded border-gray-300 text-diva-blue focus:ring-diva-gold" />
                        <span className="text-sm font-medium text-gray-600 group-hover:text-diva-blue">{cat}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-diva-blue mb-2">Lista de Itens ou Descrição do Pedido *</label>
                  <textarea required name="description" rows={6} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-diva-gold focus:ring-1 focus:ring-diva-gold outline-none transition-all" placeholder="Descreva os itens, quantidades e especificações técnicas (ex: 50 resmas de papel A4, 10 cadeiras ergonómicas...)"></textarea>
                </div>
              </div>
            </div>

            <hr className="border-gray-100" />

            {/* Section 3: Additional Info */}
            <div>
              <h3 className="text-xl font-bold text-diva-blue mb-6 flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-diva-blue text-white flex items-center justify-center text-sm">03</span>
                Informações Adicionais
              </h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-diva-blue mb-2">Urgência do Pedido</label>
                  <select name="urgency" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-diva-gold focus:ring-1 focus:ring-diva-gold outline-none transition-all bg-white">
                    <option value="Baixa">Baixa (Planeamento)</option>
                    <option value="Média">Média (Próximos 15 dias)</option>
                    <option value="Alta">Alta (Imediata)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-diva-blue mb-2">Como nos conheceu?</label>
                  <select name="source" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-diva-gold focus:ring-1 focus:ring-diva-gold outline-none transition-all bg-white">
                    <option value="Redes Sociais">Redes Sociais</option>
                    <option value="Indicação">Indicação</option>
                    <option value="Pesquisa Google">Pesquisa Google</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium">
                Ocorreu um erro ao enviar o seu pedido. Por favor, tente novamente ou contacte-nos diretamente.
              </div>
            )}

            <div className="pt-6">
              <button 
                type="submit" 
                disabled={loading}
                className={`w-full bg-diva-blue text-white py-5 rounded-2xl font-bold text-xl hover:bg-diva-blue-dark transition-all shadow-xl flex items-center justify-center gap-3 group ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {loading ? 'Processando...' : 'Solicitar Orçamento Agora'}
                {!loading && <ChevronRight className="group-hover:translate-x-1 transition-transform" />}
              </button>
              <p className="text-center text-gray-400 text-xs mt-6">
                Ao enviar este formulário, você concorda com nossos termos de privacidade e autoriza o contacto comercial.
              </p>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
};

export default function App() {
  const [currentPage, setCurrentPage] = useState('home');

  const navigate = (page: string) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="font-sans antialiased text-diva-blue bg-white">
      <Navbar onNavigate={navigate} currentPage={currentPage} />
      
      {currentPage === 'home' ? (
        <>
          <Hero onNavigate={navigate} />
          <Partners />
          <About />
          <Services />
          <Clients />
          <Contact />
        </>
      ) : (
        <QuotePage />
      )}
      
      <Footer />
    </div>
  );
}
