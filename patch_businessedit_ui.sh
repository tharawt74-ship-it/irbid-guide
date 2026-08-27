#!/bin/bash
sed -i '360,422c\
          <WorkingHoursEditor\
            workingHours={workingHours}\
            onChange={setWorkingHours}\
          />\
' src/components/admin/BusinessEditModal.tsx
