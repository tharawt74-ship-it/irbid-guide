with open('src/pages/AdminDashboard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# I will find the SECOND occurrence of `      {/* TAB 4: MARKETING CAMPAIGNS */}` and truncate the file there!
first = content.find("      {/* TAB 4: MARKETING CAMPAIGNS */}")
second = content.find("      {/* TAB 4: MARKETING CAMPAIGNS */}", first + 10)

if second != -1:
    # Wait, the closing of the file should be there.
    # The file should end right before `second` with:
    # `    </div>\n  );\n}`
    
    # We truncate it.
    content = content[:second] + "    </div>\n  );\n}\n"
    with open('src/pages/AdminDashboard.tsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Truncated duplicates!")
else:
    print("No duplicates found.")
