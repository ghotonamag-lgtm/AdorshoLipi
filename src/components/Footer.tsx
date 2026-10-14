/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { PenLine, Heart, Github, Info, X } from 'lucide-react';

export const Footer: React.FC = () => {
  const [showAbout, setShowAbout] = useState(false);

  return (
    <footer className="mt-16 pb-12 space-y-8">
      {/* Handcrafted Manifesto Banner */}
      <div className="relative rounded-3xl bg-gradient-to-r from-amber-50/80 via-purple-50/50 to-blue-50/80 border border-gray-200/80 p-6 sm:p-8 overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 shadow-xs">
            <PenLine className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base sm:text-lg font-bold text-gray-900">
              Made by hand. Proudly imperfect.
            </h3>
            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed max-w-2xl">
              Use your finger, mouse or stylus. Big strokes, tiny wiggles — your handwriting
              belongs here. আদর্শলিপি তৈরি হয়েছে শিশুদের হাতের লেখাকে ডিজিটাল প্ল্যাটফর্মে বাঁচিয়ে রাখতে।
            </p>
          </div>
        </div>
      </div>

      {/* Subfooter */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-600 border-t border-gray-100 pt-6">
        <div className="flex items-center gap-2">
          <span className="font-bold text-gray-700">আদর্শলিপি (AdorshoLipi)</span>
          <span>•</span>
          <span>Open-source Bangla Unicode font creator</span>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowAbout(true)}
            className="hover:text-purple-600 transition flex items-center gap-1 cursor-pointer"
          >
            <Info className="w-3.5 h-3.5" />
            <span>About & How it works</span>
          </button>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-purple-600 transition flex items-center gap-1"
          >
            <Github className="w-3.5 h-3.5" />
            <span>Open Source</span>
          </a>
        </div>
      </div>

      {/* About Modal */}
      {showAbout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-lg bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-gray-100">
            <button
              onClick={() => setShowAbout(false)}
              className="absolute top-5 right-5 text-gray-400 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-black text-gray-900 font-serif mb-3">
              আদর্শলিপি সম্পর্কে
            </h3>
            <div className="space-y-3 text-sm text-gray-600 leading-relaxed">
              <p>
                <strong>আদর্শলিপি</strong> একটি সম্পূর্ণ ব্রাউজার-ভিত্তিক বাংলা ইউনিকোড ফন্ট মেকার।
                কোনো ব্যাকএন্ড সার্ভার বা ক্লাউড স্টোরেজ ছাড়াই সরাসরি আপনার ব্রাউজারের মেমরিতে
                (Client-side) ওপেনটাইপ ফন্ট (.TTF) কম্পাইল করা হয়।
              </p>
              <p>
                <strong>মূল বৈশিষ্ট্যসমূহ:</strong>
              </p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Apple Pencil এবং ওয়াকম স্টাইলাসের প্রেসার সেন্সিটিভিটি ও পাম রিজেকশন সাপোর্ট।</li>
                <li>ব্রেজিয়ের কার্ভের মাধ্যমে মসৃণ ভেক্টর ডিজিটাল কালি রূপান্তর।</li>
                <li>ইউনিকোড ব্লক (U+0980 থেকে U+09FF) এবং যুক্তবর্ণের জন্য OpenType GSUB লাইগেচার।</li>
                <li>Progressive Web App (PWA) প্রযুক্তি দিয়ে ইন্টারনেট ছাড়াও প্রত্যন্ত এলাকায় সম্পূর্ণ অফলাইনে ব্যবহারের সুবিধা।</li>
              </ul>
              <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  Made with <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" /> for Bangla Typography
                </span>
                <button
                  onClick={() => setShowAbout(false)}
                  className="px-4 py-2 rounded-xl bg-purple-600 text-white font-medium text-xs hover:bg-purple-700 transition"
                >
                  বন্ধ করুন
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </footer>
  );
};
