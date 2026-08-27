#!/bin/bash
sed -i '369a\
          <SocialLinksEditor\
            socialLinks={socialLinks}\
            onChange={setSocialLinks}\
          />\
' src/components/admin/BusinessEditModal.tsx
