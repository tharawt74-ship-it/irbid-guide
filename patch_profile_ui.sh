#!/bin/bash
sed -i '1636,1702c\
                <WorkingHoursEditor\
                  workingHours={workingHours}\
                  onChange={setWorkingHours}\
                />\
\
                <SocialLinksEditor\
                  socialLinks={socialLinks}\
                  onChange={setSocialLinks}\
                />\
' src/pages/Profile.tsx
