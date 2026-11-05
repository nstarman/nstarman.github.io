# Data model: `config/collaborators.json`

Unchanged except where marked.

```jsonc
{
  "$comment": "…from public ORCID employments and educations; an entry with kind \"paper\" comes from the
               affiliation printed on one of the site's items, used only when ORCID lists nothing.
               An empty `affiliations` means neither ORCID nor any item records one.",   // CHANGED wording
  "source": "https://orcid.org",
  "people": [
    {
      "orcid": "0000-0002-1956-1305",
      "name": "Jagjit Singh Sidhu",
      "affiliations": [
        {
          "organization": "Case Western Reserve University",   // canonical spelling (R1)
          "city": "Cleveland", "region": "OH", "country": "US", // the institution's one place
          "role": null,                                          // NEW case: always null for kind paper
          "kind": "paper",                                       // NEW value: employment | education | paper
          "start": "2020-06",                                    // earliest item date recording it (R2)
          "end": "2020-06"                                       // latest item date recording it
        }
      ]
    }
  ]
}
```

Rules (all existing ones hold):

- A person has entries of kind `paper` only if their ORCID record was read and had no employment and no
  education.
- One `paper` entry per institution per person; entries newest first.
- `paper` entries go through the same canonical spelling and place as everyone's ORCID entries.
- `start <= end`, both at the precision of the items.
