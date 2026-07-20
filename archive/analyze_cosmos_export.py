import collections
import json
import re

import openpyxl

WORKBOOK = r"C:\Users\victorvm\Downloads\Cosmos_GOV_Export_2026-07-16_17-11.xlsx"

sheet = openpyxl.load_workbook(WORKBOOK, read_only=True, data_only=False).active
rows = list(sheet.iter_rows(min_row=12, values_only=True))


def counts(column):
    return collections.Counter(
        str(row[column]).strip() for row in rows if row[column] not in (None, "")
    )


summary = {
    "records": len(rows),
    "document_types": counts(1).most_common(),
    "publishing_org_units": counts(5).most_common(30),
    "target_orgs": counts(6).most_common(30),
    "groups": counts(26).most_common(),
    "process_categories": counts(23).most_common(30),
    "regions": counts(21).most_common(),
    "primary_languages": counts(9).most_common(),
    "contacts_unique": len(counts(20)),
    "main_document_urls": sum(1 for row in rows if row[13]),
    "attachment_cells": sum(1 for row in rows if row[18] or row[19]),
    "url_instances": sum(
        len(re.findall(r"https?://[^)\s\"]+", str(value)))
        for row in rows
        for value in (row[13], row[17], row[18], row[19])
    ),
}

print(json.dumps(summary, ensure_ascii=False, default=str, indent=2))
