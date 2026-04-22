import re

with open("apps/customers/api.py", "r") as f:
    content = f.read()

# 1. Extract import section
import_end = content.find('\n@router.get("/{customer_id}/"')
top_section = content[:import_end]

# 2. Extract customer_id sections
cust_id_start = import_end
enroll_public_start = content.find('\n@router.post("/enroll/"')
cust_id_section = content[cust_id_start:enroll_public_start]

# 3. Extract enroll_public section
seg_start = content.find('\n# =============================================================================\n# SEGMENTATION')
enroll_public_section = content[enroll_public_start:seg_start]

# 4. Extract segments section
segments_section = content[seg_start:]

# REORDER: top -> enroll -> segments -> cust_id
new_content = top_section + enroll_public_section + segments_section + cust_id_section

with open("apps/customers/api.py", "w") as f:
    f.write(new_content)

print("done")
