#!/bin/bash
sed -i '1264c\
                {/* Social Links */}\
                {business.socialLinks && Object.values(business.socialLinks).some(link => link) && (\
                  <div className="pt-2 border-t border-stone-100">\
                    <h4 className="text-xs font-bold text-stone-600 mb-3 flex items-center gap-1.5">\
                      <Globe className="h-3.5 w-3.5 text-[#1a4d2e]" />\
                      <span>حسابات المحل الرسمية</span>\
                    </h4>\
                    <div className="flex flex-wrap gap-2">\
                      {Object.entries(business.socialLinks).map(([platform, link]) => {\
                        if (!link) return null;\
                        let href = link;\
                        if (!link.startsWith("http")) {\
                          if (platform === "facebook") href = `https://facebook.com/${link}`;\
                          if (platform === "instagram") href = `https://instagram.com/${link}`;\
                          if (platform === "tiktok") href = `https://tiktok.com/@${link}`;\
                          if (platform === "x") href = `https://x.com/${link}`;\
                          if (platform === "youtube") href = `https://youtube.com/@${link}`;\
                          if (platform === "website") href = `https://${link}`;\
                        }\
                        let Icon = Globe;\
                        let colorClass = "text-stone-700 bg-stone-100 hover:bg-stone-200 border-stone-200";\
                        let label = "الموقع";\
                        if (platform === "facebook") { Icon = Facebook; colorClass = "text-blue-600 bg-blue-50 hover:bg-blue-100 border-blue-200"; label = "فيسبوك"; }\
                        if (platform === "instagram") { Icon = Instagram; colorClass = "text-pink-600 bg-pink-50 hover:bg-pink-100 border-pink-200"; label = "إنستغرام"; }\
                        if (platform === "tiktok") { Icon = Smartphone; colorClass = "text-stone-900 bg-stone-100 hover:bg-stone-200 border-stone-300"; label = "تيك توك"; }\
                        if (platform === "x") { Icon = Twitter; colorClass = "text-stone-800 bg-stone-100 hover:bg-stone-200 border-stone-300"; label = "X (تويتر)"; }\
                        if (platform === "youtube") { Icon = Youtube; colorClass = "text-red-600 bg-red-50 hover:bg-red-100 border-red-200"; label = "يوتيوب"; }\
                        return (\
                          <a\
                            key={platform}\
                            href={href}\
                            target="_blank"\
                            rel="noreferrer"\
                            className={`flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-bold border transition-colors ${colorClass}`}\
                          >\
                            <Icon className="h-3.5 w-3.5" />\
                            <span>{label}</span>\
                          </a>\
                        );\
                      })}\
                    </div>\
                  </div>\
                )}\
' src/pages/BusinessDetail.tsx
