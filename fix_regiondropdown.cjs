const fs = require('fs');

let code = fs.readFileSync('src/components/RegionDropdownFilter.tsx', 'utf8');

// I need to change how neighborhoods is used. It's now IrbidAreaGroup[].
code = code.replace(/const totalAreasCount = neighborhoods\.length;/, 
"const totalAreasCount = neighborhoods.reduce((acc, g) => acc + g.areas.length, 0);");

// Let's replace the filtering logic
code = code.replace(
  /const filteredNeighborhoods = neighborhoods\.filter\(area =>[\s\S]*?\] :\s*\[\];/m,
  `const filteredGroups = neighborhoods.map(group => {
    const matchingAreas = group.areas.filter(area =>
      area.toLowerCase().includes(searchQuery.trim().toLowerCase())
    );
    return {
      ...group,
      areas: matchingAreas
    };
  }).filter(group => group.areas.length > 0);`
);

// Now update the JSX to map over filteredGroups
code = code.replace(
  /\{neighborhoods\.map\(\(area\) => \([\s\S]*?<\/option>\n\s*\)\)}/,
  `{filteredGroups.map((group, i) => (
                <optgroup key={i} label={group.groupName} className="font-bold text-[#1a4d2e] bg-stone-50">
                  {group.areas.map((area) => (
                    <option key={area} value={area} className="text-stone-800 font-medium">
                      📍 {area}
                    </option>
                  ))}
                </optgroup>
              ))}`
);

fs.writeFileSync('src/components/RegionDropdownFilter.tsx', code);
