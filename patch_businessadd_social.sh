#!/bin/bash
sed -i '303,353c\
          <WorkingHoursEditor\
            workingHours={workingHours}\
            onChange={setWorkingHours}\
          />\
\
          <SocialLinksEditor\
            socialLinks={socialLinks}\
            onChange={setSocialLinks}\
          />\
' src/components/admin/BusinessAddModal.tsx
