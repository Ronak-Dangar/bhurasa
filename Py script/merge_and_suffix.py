# merge_and_suffix_vcf.py

def process_vcf(input_files, suffix, output_file):
    final_contacts = []

    for file in input_files:
        with open(file, "r", encoding="utf-8") as f:
            entry = []
            for line in f:
                if line.startswith("BEGIN:VCARD"):
                    entry = [line]
                elif line.startswith("END:VCARD"):
                    entry.append(line)
                    final_contacts.append(entry)
                    entry = []
                else:
                    entry.append(line)

    # Modify FN: and N: fields
    for entry in final_contacts:
        for i, line in enumerate(entry):
            if line.startswith("FN:"):
                name = line[3:].strip()
                entry[i] = f"FN:{name} {suffix}\n"

            elif line.startswith("N:"):
                parts = line[2:].split(";")
                parts[0] = parts[0] + " " + suffix  # last name field
                entry[i] = "N:" + ";".join(parts)

    # Write output
    with open(output_file, "w", encoding="utf-8") as out:
        for entry in final_contacts:
            for line in entry:
                out.write(line)

    print(f"Done! Merged file saved as: {output_file}")


# ===== RUN THE FUNCTION =====
process_vcf(
    input_files=["contacts_1.vcf", "contacts.vcf"],  # your two files
    suffix="BHURASA OIL",                                # suffix to add
    output_file="contacts_final.vcf"                 # output file
)
