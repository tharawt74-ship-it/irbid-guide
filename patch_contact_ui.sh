#!/bin/bash
sed -i '358,433c\
          <WorkingHoursEditor\
            workingHours={workingHours}\
            onChange={setWorkingHours}\
          />\
\
          <SocialLinksEditor\
            socialLinks={socialLinks}\
            onChange={setSocialLinks}\
          />\
' src/pages/Contact.tsx
