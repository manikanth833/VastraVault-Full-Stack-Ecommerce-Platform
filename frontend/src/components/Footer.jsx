import React from "react";
import { Link } from "react-router-dom";
import { Facebook, Instagram, Twitter, Mail, Phone, MapPin } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-charcoal-900 text-white pt-20 pb-8 border-t-2 border-gold-500">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-12">
        {/* Brand Column */}
        <div className="space-y-6">
          <Link to="/" className="flex flex-col">
            <span className="font-serif text-3xl font-semibold tracking-widest text-gold-500 leading-none">
              ANANYA
            </span>
            <span className="text-[9px] tracking-[0.3em] text-neutral-400 font-semibold uppercase mt-1">
              Heritage Sarees
            </span>
          </Link>
          <p className="text-neutral-400 text-sm leading-relaxed">
            Celebrating the rich tradition of Indian handlooms. We curate and deliver pure silk, Banarasi, and Kanjeevaram sarees of unmatched authenticity.
          </p>
          <div className="flex space-x-4">
            <a href="#" className="text-neutral-400 hover:text-gold-500 transition-colors">
              <Facebook className="w-5 h-5" />
            </a>
            <a href="#" className="text-neutral-400 hover:text-gold-500 transition-colors">
              <Instagram className="w-5 h-5" />
            </a>
            <a href="#" className="text-neutral-400 hover:text-gold-500 transition-colors">
              <Twitter className="w-5 h-5" />
            </a>
          </div>
        </div>

        {/* Collections */}
        <div>
          <h3 className="text-gold-500 font-serif text-lg font-semibold tracking-wider mb-6">Collections</h3>
          <ul className="space-y-3 text-sm text-neutral-400">
            <li><Link to="/catalog?category=silk-sarees" className="hover:text-white transition-colors">Pure Banarasi Silk</Link></li>
            <li><Link to="/catalog?category=silk-sarees" className="hover:text-white transition-colors">Kanchipuram Brocades</Link></li>
            <li><Link to="/catalog?category=cotton-linen" className="hover:text-white transition-colors">Premium Organic Linen</Link></li>
            <li><Link to="/catalog?category=organza-georgette" className="hover:text-white transition-colors">Sheer Embroidered Organza</Link></li>
          </ul>
        </div>

        {/* Support & Legal */}
        <div>
          <h3 className="text-gold-500 font-serif text-lg font-semibold tracking-wider mb-6">Customer Care</h3>
          <ul className="space-y-3 text-sm text-neutral-400">
            <li><Link to="/profile" className="hover:text-white transition-colors">Track My Order</Link></li>
            <li><a href="#" className="hover:text-white transition-colors">Shipping & Returns</a></li>
            <li><a href="#" className="hover:text-white transition-colors">Authenticity Guarantee</a></li>
            <li><a href="#" className="hover:text-white transition-colors">Frequently Asked Questions</a></li>
          </ul>
        </div>

        {/* Contact Info */}
        <div className="space-y-6">
          <h3 className="text-gold-500 font-serif text-lg font-semibold tracking-wider mb-6">Heritage House</h3>
          <ul className="space-y-3 text-sm text-neutral-400">
            <li className="flex items-start gap-2">
              <MapPin className="w-5 h-5 text-gold-500 shrink-0 mt-0.5" />
              <span>102, Palace Orchard Road, Koramangala, Bengaluru, KA - 560034</span>
            </li>
            <li className="flex items-center gap-2">
              <Phone className="w-5 h-5 text-gold-500 shrink-0" />
              <span>+91 80 4910 2200</span>
            </li>
            <li className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-gold-500 shrink-0" />
              <span>concierge@ananyasarees.com</span>
            </li>
          </ul>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-16 pt-8 border-t border-neutral-800 text-center text-xs text-neutral-500">
        <p>&copy; {new Date().getFullYear()} Ananya Sarees. All Rights Reserved. Crafted with love for Indian Heritage.</p>
      </div>
    </footer>
  );
}
