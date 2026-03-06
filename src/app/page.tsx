'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function Home() {
  const { data: session } = useSession();
  const [mounted, setMounted] = useState(false);
  const [currentYear, setCurrentYear] = useState('2025');
  const [isNavOpen, setIsNavOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    setCurrentYear(new Date().getFullYear().toString());
  }, []);

  const oils = [
    {
      name: 'Gingelly Oil',
      description: 'Pure sesame oil rich in antioxidants and anti-inflammatory properties. Perfect for heart-healthy cooking.',
      image: '/Gingelly-Oil-1lr-5.jpg',
      benefits: ['High in antioxidants', 'Anti-inflammatory', 'Heart healthy']
    },
    {
      name: 'Ground Nut Oil',
      description: 'Premium groundnut oil rich in vitamin E and helps maintain healthy cholesterol levels.',
      image: '/TrinityOilsGroundnutOil-1L-front.jpg',
      benefits: ['Rich in Vitamin E', 'Lowers cholesterol', 'Light taste']
    },
    {
      name: 'Coconut Oil',
      description: 'Pure coconut oil that increases good cholesterol and is excellent for skin and hair care.',
      image: '/TrinityOilsCoconutOil-1L-front.jpg',
      benefits: ['Increases HDL', 'Skin & hair friendly', 'Natural moisturizer']
    },
    {
      name: 'Deepam Oil',
      description: 'Traditional oil specifically crafted for lighting purposes and spiritual practices.',
      image: '/TrinityOilsDeepamOil-1L-front.jpg',
      benefits: ['Long burning', 'Smokeless', 'Traditional purity']
    },
    {
      name: 'Castor Oil',
      description: 'Pure castor oil for therapeutic and cosmetic applications with multiple health benefits.',
      image: '/castroloil.jpg',
      benefits: ['Therapeutic grade', 'Multi-purpose', 'Natural healing']
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 bg-white/95 backdrop-blur-md shadow-lg border-b border-gray-200">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center">
            <img 
              src="/TOM_logo.png" 
              alt="Trinity Oil Mills" 
              className="h-12 w-auto object-contain drop-shadow-md"
            />
          </div>
          
          {/* Mobile nav toggle */}
          <button
            type="button"
            className="md:hidden inline-flex items-center justify-center rounded-md p-2 text-gray-700 hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-green-700"
            aria-label="Toggle navigation"
            onClick={() => setIsNavOpen(!isNavOpen)}
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isNavOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-700">
            <a href="#about" className="hover:text-green-700 transition-colors">About</a>
            <a href="#products" className="hover:text-green-700 transition-colors">Products</a>
            <a href="#quality" className="hover:text-green-700 transition-colors">Quality</a>
            <a href="#contact" className="hover:text-green-700 transition-colors">Contact</a>
          </nav>
          <div className="flex items-center gap-3">
            {session ? (
              <Link href="/dashboard" className="inline-flex items-center rounded-full bg-green-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-green-700 transition-all">
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link href="/login" className="hidden sm:inline-flex items-center rounded-full border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all">
                  Admin Login
                </Link>
                <a href="tel:+919952055660" className="inline-flex items-center rounded-full bg-yellow-500 px-6 py-2.5 text-sm font-bold text-gray-900 hover:bg-yellow-400 transition-all pulse-cta">
                  📞 Enquire Now
                </a>
              </>
            )}
          </div>
        </div>

        {/* Mobile navigation panel */}
        {isNavOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white/95 backdrop-blur-sm">
            <nav className="mx-auto max-w-7xl px-6 py-3 flex flex-col gap-2 text-sm font-medium text-gray-700">
              <a href="#about" className="py-1 hover:text-green-700 transition-colors" onClick={() => setIsNavOpen(false)}>About</a>
              <a href="#products" className="py-1 hover:text-green-700 transition-colors" onClick={() => setIsNavOpen(false)}>Products</a>
              <a href="#quality" className="py-1 hover:text-green-700 transition-colors" onClick={() => setIsNavOpen(false)}>Quality</a>
              <a href="#contact" className="py-1 hover:text-green-700 transition-colors" onClick={() => setIsNavOpen(false)}>Contact</a>
              {!session && (
                <>
                  <Link
                    href="/login"
                    className="mt-2 inline-flex w-full items-center justify-center rounded-full border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all"
                    onClick={() => setIsNavOpen(false)}
                  >
                    Admin Login
                  </Link>
                  <a
                    href="tel:+919952055660"
                    className="mt-2 inline-flex w-full items-center justify-center rounded-full bg-yellow-500 px-6 py-2.5 text-sm font-bold text-gray-900 hover:bg-yellow-400 transition-all"
                    onClick={() => setIsNavOpen(false)}
                  >
                    📞 Enquire Now
                  </a>
                </>
              )}
            </nav>
          </div>
        )}
      </header>

      {/* Hero Section with Background */}
      <section className="relative min-h-screen bg-hero-pattern flex items-center justify-center overflow-hidden">
        {/* Minimal overlay for text readability */}
        <div className="absolute inset-0 bg-black/20"></div>
        
        {/* Floating elements */}
        <div className="absolute top-20 left-10 w-20 h-20 bg-yellow-400/20 rounded-full blur-xl float-animation"></div>
        <div className="absolute bottom-32 right-16 w-32 h-32 bg-green-400/20 rounded-full blur-xl float-animation" style={{animationDelay: '2s'}}></div>
        <div className="absolute top-1/3 right-20 w-16 h-16 bg-yellow-300/20 rounded-full blur-xl float-animation" style={{animationDelay: '4s'}}></div>

        <div className="relative z-10 mx-auto max-w-7xl px-6 text-center">
          <div className="mb-8">
            <span className="inline-flex items-center rounded-full bg-white/20 backdrop-blur px-6 py-2 text-white text-sm font-semibold border border-white/30">
              ✨ Premium Quality Since 2014
            </span>
          </div>
          
          {/* Main Trinity Oil Mills Title */}
          <h1 
            className="text-white mb-6 drop-shadow-2xl"
            style={{
              fontFamily: 'Great Vibes',
              fontStyle: 'normal',
              fontWeight: 100,
              color: 'rgb(255, 255, 255)',
              fontSize: 'clamp(3rem, 10vw, 130px)',
              lineHeight: 1.1
            }}
          >
            Trinity Oil Mills
          </h1>
          
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-light text-white/90 tracking-wide mb-8 drop-shadow-lg">
            Nature | Pure | Best
          </h2>
          
          <p className="text-xl md:text-2xl text-white/90 mb-8 max-w-3xl mx-auto font-light leading-relaxed">
            Discover the finest collection of <span className="text-yellow-400 font-semibold">cold-pressed oils</span> crafted with traditional methods and modern quality standards.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <a href="#products" className="inline-flex w-full sm:w-auto items-center justify-center rounded-full bg-yellow-500 px-8 py-4 text-lg font-bold text-gray-900 hover:bg-yellow-400 transition-all pulse-cta shadow-xl">
              Explore Our Oils
              <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </a>
            <a href="tel:+919952055660" className="inline-flex w-full sm:w-auto items-center justify-center rounded-full border-2 border-white/30 bg-white/10 backdrop-blur px-8 py-4 text-lg font-semibold text-white hover:bg-white/20 transition-all">
              📞 Call Us
            </a>
          </div>
          
          {/* Quality badges */}
          <div className="flex flex-wrap items-center justify-center gap-8 text-white/80">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-400 rounded-full"></div>
              <span className="text-sm font-medium">100% Natural</span>
              </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
              <span className="text-sm font-medium">Cold-Pressed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
              <span className="text-sm font-medium">Lab Tested</span>
              </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-400 rounded-full"></div>
              <span className="text-sm font-medium">Premium Quality</span>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-white/60 animate-bounce">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 bg-white">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold font-[var(--font-display)] text-gray-900 mb-4">
              Traditional Methods, <span className="gradient-text">Modern Standards</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Since 2014, Trinity Oil Mills has been committed to producing the highest quality cold-pressed oils using traditional extraction methods while maintaining modern hygiene and quality standards.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <div className="space-y-8">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Premium Seed Selection</h3>
                    <p className="text-gray-600">We source the finest quality seeds directly from trusted farmers, ensuring traceability and purity from farm to bottle.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Cold-Press Technology</h3>
                    <p className="text-gray-600">Our traditional cold-pressing method preserves natural nutrients, flavor, and aroma without using heat or chemicals.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Quality Assurance</h3>
                    <p className="text-gray-600">Every batch undergoes rigorous quality testing for purity, moisture content, and nutritional value in certified laboratories.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-8 text-center border border-green-200">
                <div className="text-4xl font-[var(--font-display)] font-black text-green-700">100%</div>
                <div className="text-sm font-semibold text-green-800 mt-1">Natural</div>
                <div className="text-xs text-green-600 mt-1">No Chemicals</div>
              </div>
              <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-2xl p-8 text-center border border-yellow-200">
                <div className="text-4xl font-[var(--font-display)] font-black text-yellow-700">Cold</div>
                <div className="text-sm font-semibold text-yellow-800 mt-1">Pressed</div>
                <div className="text-xs text-yellow-600 mt-1">No Heat</div>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-8 text-center border border-blue-200">
                <div className="text-4xl font-[var(--font-display)] font-black text-blue-700">Lab</div>
                <div className="text-sm font-semibold text-blue-800 mt-1">Tested</div>
                <div className="text-xs text-blue-600 mt-1">Certified</div>
            </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-8 text-center border border-purple-200">
                <div className="text-4xl font-[var(--font-display)] font-black text-purple-700">10+</div>
                <div className="text-sm font-semibold text-purple-800 mt-1">Years</div>
                <div className="text-xs text-purple-600 mt-1">Experience</div>
            </div>
            </div>
          </div>
        </div>
      </section>

      {/* Products Section */}
      <section id="products" className="py-20 bg-gradient-to-br from-gray-50 to-white">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold font-[var(--font-display)] text-gray-900 mb-4">
              Our <span className="gradient-text">Premium Oils</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Discover our carefully curated collection of cold-pressed oils, each crafted with precision and care to deliver exceptional quality and health benefits.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-6 lg:gap-8">
            {oils.map((oil, index) => (
              <div key={oil.name} className="group bg-white rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100 hover:border-green-200 w-full sm:w-80 lg:w-72 xl:w-80 flex-shrink-0">
                <div className="aspect-[4/3] bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden flex items-center justify-center p-4">
                  <img 
                    src={oil.image} 
                    alt={oil.name}
                    className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      e.currentTarget.src = '/TOM_logo.png';
                    }}
                  />
                </div>
                <div className="p-8">
                  <h3 className="text-2xl font-[var(--font-display)] font-bold text-gray-900 mb-3 group-hover:text-green-700 transition-colors">
                    {oil.name}
                  </h3>
                  <p className="text-gray-600 mb-4 leading-relaxed">
                    {oil.description}
                  </p>
                  <div className="space-y-2 mb-6">
                    {oil.benefits.map((benefit, benefitIndex) => (
                      <div key={benefitIndex} className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-sm text-gray-700 font-medium">{benefit}</span>
                      </div>
                    ))}
                  </div>
                  <a href={`mailto:TrintiyOilmills@gmail.com?subject=Inquiry about ${oil.name}&body=Hi, I would like to know more about your ${oil.name}. Please provide more details about pricing and availability.`} className="block w-full bg-gradient-to-r from-green-600 to-green-700 text-white py-3 px-6 rounded-xl font-semibold hover:from-green-700 hover:to-green-800 transition-all transform hover:scale-105 text-center">
                    Get more details
                  </a>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <a href="mailto:TrintiyOilmills@gmail.com?subject=Bulk Orders & Wholesale Inquiry&body=Hi, I'm interested in bulk orders and wholesale pricing for your cold-pressed oils. Please provide more information." className="inline-flex w-full sm:w-auto items-center justify-center rounded-full bg-gradient-to-r from-green-600 to-green-700 px-8 py-4 text-lg font-bold text-white hover:from-green-700 hover:to-green-800 transition-all shadow-xl">
              Bulk Orders & Wholesale
              <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 1.05c2.59.34 5.21-.55 7.11-2.41l.1-.1a9.97 9.97 0 001.42-12.54" />
              </svg>
            </a>
          </div>
        </div>
      </section>

      {/* Quality Section */}
      <section id="quality" className="py-20 bg-white">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-4xl md:text-5xl font-[var(--font-display)] font-bold text-gray-900 mb-6">
                Quality You Can <span className="gradient-text">Trust</span>
              </h2>
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                Our commitment to quality goes beyond extraction. From seed selection to final packaging, every step follows strict quality protocols to ensure you receive nothing but the best.
              </p>
              
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-2xl">🌱</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Farm to Bottle Traceability</h3>
                    <p className="text-gray-600">Complete transparency in our supply chain from farm sourcing to final product.</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0 w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center">
                    <span className="text-2xl">🧪</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Laboratory Certified</h3>
                    <p className="text-gray-600">Every batch is tested for purity, nutritional content, and safety standards.</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0 w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-2xl">🏆</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Award-Winning Quality</h3>
                    <p className="text-gray-600">Recognized for excellence in traditional oil production and quality standards.</p>
                  </div>
                </div>
              </div>
          </div>

            <div className="relative">
              <div className="aspect-square bg-gradient-to-br from-green-100 via-yellow-50 to-green-100 rounded-3xl border-2 border-green-200 flex items-center justify-center overflow-hidden">
                <img 
                  src="/TOM_logo.png" 
                  alt="Trinity Oil Mills Quality" 
                  className="w-2/3 h-auto object-contain opacity-80"
                />
              </div>
              <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-yellow-400/30 rounded-full blur-xl"></div>
              <div className="absolute -top-6 -right-6 w-32 h-32 bg-green-400/30 rounded-full blur-xl"></div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-green-800 via-green-700 to-green-800">
          <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-[var(--font-display)] font-bold text-white mb-6">
            Ready to Experience <span className="text-yellow-400">Pure Quality?</span>
          </h2>
          <p className="text-xl text-green-100 mb-8 max-w-2xl mx-auto">
            Join thousands of satisfied customers who trust Trinity Oil Mills for their cooking and wellness needs.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="mailto:TrintiyOilmills@gmail.com" className="inline-flex w-full sm:w-auto items-center justify-center rounded-full bg-yellow-500 px-8 py-4 text-lg font-bold text-gray-900 hover:bg-yellow-400 transition-all pulse-cta">
              Contact Us Today
            </a>
            <a href="tel:+919952055660" className="inline-flex w-full sm:w-auto items-center justify-center rounded-full border-2 border-white bg-white/10 backdrop-blur px-8 py-4 text-lg font-semibold text-white hover:bg-white/20 transition-all">
              Call Now
            </a>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-16 bg-gray-50">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start mb-4">
                <img 
                  src="/TOM_logo.png" 
                  alt="Trinity Oil Mills" 
                  className="h-10 w-auto object-contain"
                />
              </div>
              <p className="text-gray-600 mb-4">Premium Cold-Pressed Oils • Since 2014</p>
              <p className="text-sm text-gray-500">Nature • Pure • Best</p>
            </div>
            
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">Contact Information</h3>
              <div className="space-y-3 text-gray-600">
                <div className="flex items-start gap-2">
                  <span className="text-green-600">📞</span>
                  <div>
                    <div>+91 99520 55660</div>
                    <div>+91 97109 03330</div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-600">📍</span>
                  <div>337, 339, Paper Mills Road, Perambur, Chennai, Tamil Nadu, 600011</div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-600">🕒</span>
                  <div>10:00 AM – 08:30 PM (Sunday Holiday)</div>
                </div>
              </div>
          </div>
            
          <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Links</h3>
              <div className="space-y-2">
                <a href="#products" className="block text-gray-600 hover:text-green-700 transition-colors">Our Products</a>
                <a href="#quality" className="block text-gray-600 hover:text-green-700 transition-colors">Quality Standards</a>
                <a href="#about" className="block text-gray-600 hover:text-green-700 transition-colors">About Us</a>
                <Link href="/login" className="block text-gray-600 hover:text-green-700 transition-colors">Admin Portal</Link>
              </div>
          </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-sm text-gray-400">
              © {currentYear} Trinity Oil Mills. All rights reserved.
            </div>
            <div className="flex items-center gap-6 text-sm text-gray-400">
              <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-white transition-colors">Sitemap</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}