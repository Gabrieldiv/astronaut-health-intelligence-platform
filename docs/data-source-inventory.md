# Data source inventory (Etapa 0: Data Discovery)

Date of consultation: 2026-11-14 (UTC). All queries were made live against public NASA endpoints, without API keys or authentication.

Scope: find real, public, human spaceflight data that fits a health dashboard, import a small subset with full provenance (US-008, US-016), and show it in the UI as historical reference. Everything the crew dashboard displays remains `SIMULATED`.

## 1. How discovery was done

| Step | Endpoint | Notes |
| --- | --- | --- |
| Search | `https://osdr.nasa.gov/osdr/data/search?term=<term>&type=cgene&from=0&size=100` | 14 terms, results deduplicated by accession |
| Study metadata | `https://osdr.nasa.gov/osdr/data/osd/meta/<n>` | ISA metadata: description, factors, protocols, samples, sex, mission |
| File listing | `https://osdr.nasa.gov/osdr/data/osd/files/<n>` | file names, sizes, categories, download path |
| Cross check | `https://visualization.osdr.nasa.gov/biodata/api/v2/dataset/<OSD>/` and `.../files/` | Biological Data API returns the same metadata and download URLs |
| Access policy | `https://science.nasa.gov/reference/osdr-faq/` | see section 5 |

Search hit counts (total reported by the API): human 227, astronaut 68, Inspiration4 8, crew 87, spaceflight 395, physiology 23, sleep 3, cardiovascular 28, immune 74, blood 146, "Homo sapiens" 120, "complete blood count" 6, "metabolic panel" 0, cytokine 7.
Across the first 100 hits of each term: 367 unique studies, 110 with organism Homo sapiens. Most Homo sapiens hits are cell cultures, organoids, tissue chips or ground analogs, not astronauts.

Note: OSD-575 and OSD-656 did not appear in any search result even though they exist and are public; they were found through the "related studies" list in the OSD-569 and OSD-575 descriptions. The search index is therefore not exhaustive.

Full machine readable output: `data/manifests/osdr-discovery.json`.

## 2. Candidates examined

| Accession | Title (short) | Organism | Mission | Data types | Decision |
| --- | --- | --- | --- | --- | --- |
| **OSD-569** | Whole blood measurements, SpaceX Inspiration4 (RNA-seq, epitranscriptome, WGS, clonal hematopoiesis, CBC) | Homo sapiens (4 crew) | SpaceX Inspiration4 (2021-09-16 to 2021-09-18) | Complete blood count (CSV, 26 KB), long read RNA-seq (XLSX, 123 MB), m6A, WGS, targeted sequencing | **Chosen**: small clinical CBC table, 7 time points, units and lab ranges in the file |
| **OSD-575** | Inspiration4 blood serum metabolic panel and immune/cardiac cytokine arrays | Homo sapiens (4 crew) | SpaceX Inspiration4 | Comprehensive metabolic panel (CSV, 25 KB), Eve immune and cardiovascular multiplex (CSV), Alamar NULISA (XLSX) | **Chosen** (CMP only): clinical chemistry with units and lab ranges. Multiplex panels not imported: values are normalized to the crew pre-flight average (relative, unitless), harder to explain on a dashboard |
| OSD-656 | Inspiration4 urine inflammation panel (NULISAseq) | Homo sapiens | SpaceX Inspiration4 | 200+ protein relative abundances (CSV 115 KB, XLSX) | Rejected for now: relative NGS counts, no clinical units |
| OSD-571 | Inspiration4 plasma profiling (proteomics, EVPs, metabolomics, cfDNA, cfRNA) | Homo sapiens | SpaceX Inspiration4 | Omics matrices (XLSX up to 0.3 MB, TSV 61 MB) | Rejected: omics features, not dashboard measures |
| OSD-570 | Inspiration4 PBMC snRNA-seq, snATAC-seq, VDJ | Homo sapiens | SpaceX Inspiration4 | Single cell processed matrices (3 to 52 MB XLSX) | Rejected: too large and not clinical |
| OSD-687 | Inspiration4 T-cell histone modification profiling | Homo sapiens | SpaceX Inspiration4 | ChIP style sequencing | Rejected: omics |
| OSD-572, OSD-573, OSD-630 | Inspiration4 swabs, capsule swabs, stool | Microbiota | SpaceX Inspiration4 | Metagenomics | Rejected: microbial, not human physiology |
| OSD-574 | Inspiration4 deltoid skin biopsy and microbiome | Homo sapiens and microbiota | SpaceX Inspiration4 | Spatial transcriptomics, metagenomics | Rejected: omics |
| OSD-53 | Spaceflight modulates gene expression in astronauts | Homo sapiens | not stated | Transcription profiling (3 files) | Rejected: no tabular clinical file |
| OSD-903 / OSD-943 | Longitudinal transcriptomic and epigenetic analysis in astronauts | Homo sapiens | AX-1 | RNA-seq / epigenetics (1 file listed for OSD-903) | Rejected: omics, no clinical table |
| OSD-530 | Cell-free RNA from six astronauts (JAXA CFE study) | Homo sapiens | not stated in search record | Normalized RNA-seq counts (XLSX 0.1 to 11 MB) | Rejected: omics |
| OSD-353 | Spaceflight factors and the human plasma proteome (real missions and ground experiments) | Homo sapiens | not stated | Proteomics | Rejected: omics, mixes flight and ground analog |
| OSD-359 | Exhaled breath condensate proteome after long-term spaceflights | Homo sapiens | not stated | Proteomics | Rejected: omics |
| OSD-174 | Hair follicle gene expression of ISS astronauts | Homo sapiens | JAXA | Transcription profiling | Rejected: omics |
| OSD-542 | 14 days of confinement, blood gene expression | Homo sapiens | ground analog | Microarray (43 to 56 MB CSV) | Rejected: analog, omics, large |
| OSD-140 | Mars 520-d simulation epigenetics | Homo sapiens | ground analog | DNA methylation | Rejected: analog, omics |
| OSD-195, OSD-51, OSD-198, OSD-942, OSD-946, OSD-370 | Bed rest and inactivity muscle studies | Homo sapiens | ground analog | Microarray / miRNA | Rejected: analog (would have to be labeled as such), omics |
| Many others (OSD-5, 13, 52, 54, 114, 118, 172, 188, 258, 344, 635, 684, 811, 863, 871, 937 and similar) | Cell lines, organoids, tissue chips flown or in simulated microgravity | Homo sapiens cells | various | Transcription profiling | Rejected: not people |

Not found in this discovery: continuous physiological signals (ECG, HR, SpO2), sleep or actigraphy files for astronauts, or cabin telemetry as human data. The term "sleep" returned 3 hits, none with human sleep measurements. EDA (cabin environment) and RadLab (dosimetry) were not imported; see section 6.

## 3. Chosen datasets and provenance

Both datasets come from the same Inspiration4 biospecimen program (Weill Cornell IRB protocol 21-05023569; the metadata states "All crew members have consented for data and sample sharing").

### OSD-569: complete blood count

| Field | Value |
| --- | --- |
| Source | NASA Open Science Data Repository (OSDR) |
| Study page | https://osdr.nasa.gov/bio/repo/data/studies/OSD-569 |
| Metadata version | OSDR metadata version 4; public release 14-May-2024 |
| File | `LSDS-7_Complete_Blood_Count_CBC.upload_SUBMITTED.csv` (26,138 bytes) |
| Download URL | https://osdr.nasa.gov/geode-py/ws/studies/OSD-569/download?source=datamanager&file=LSDS-7_Complete_Blood_Count_CBC.upload_SUBMITTED.csv |
| SHA-256 | `10a878b009eb…` (full value in `data/manifests/OSD-569.json`) |
| Population | 4 subjects C001 to C004 (2 female, 2 male per sample metadata); description says "four private astronauts". Age not stated |
| Design | Repeated measures, same 4 subjects, 7 ground time points: L-92, L-44, L-3, R+1, R+45, R+82, R+194. No in-flight samples in this file |
| Assay | Whole blood in K2 EDTA tube, Quest Diagnostics test code 6399, Sysmex XN analyzer (from the study protocol) |
| Content | 553 rows, 20 analytes (WBC, RBC, hemoglobin, hematocrit, MCV, MCH, MCHC, RDW, platelets, MPV, 5 absolute and 5 percent differential counts), units and lab reference ranges per row |

### OSD-575: comprehensive metabolic panel

| Field | Value |
| --- | --- |
| Study page | https://osdr.nasa.gov/bio/repo/data/studies/OSD-575 |
| Metadata version | OSDR metadata version 3; public release 14-May-2024 |
| File | `LSDS-8_Comprehensive_Metabolic_Panel_CMP.upload_SUBMITTED.csv` (25,275 bytes) |
| Download URL | https://osdr.nasa.gov/geode-py/ws/studies/OSD-575/download?source=datamanager&file=LSDS-8_Comprehensive_Metabolic_Panel_CMP.upload_SUBMITTED.csv |
| SHA-256 | `dab247eb794e…` (full value in `data/manifests/OSD-575.json`) |
| Population | same 4 subjects C001 to C004 (2 female, 2 male); age not stated |
| Design | Same 7 time points in the file (L-92, L-44, L-3, R+1, R+45, R+82, R+194) |
| Assay | Fresh serum (serum separator tube), Quest Diagnostics test code 10231, Beckman Coulter AU5800 |
| Content | 531 rows, 19 analytes (glucose, BUN, creatinine, BUN/creatinine ratio, sodium, potassium, chloride, CO2, calcium, total protein, albumin, globulin, A/G ratio, total bilirubin, alkaline phosphatase, AST, ALT, two eGFR variants) |

Why these two: they are the only human spaceflight files found that are small, tabular, clinically meaningful, carry explicit units and per row lab reference ranges, and follow the same people across pre and post flight time points. They map naturally to the dashboard's language (blood, immune cells, electrolytes, kidney and liver markers) without any interpretation by AHI.

The SUBMITTED files were preferred over the TRANSFORMED ones: they are in long format with an explicit `UNITS` column, while the TRANSFORMED CBC file encodes units in column names and labels hemoglobin as `hemoglobin_value_percent` although the submitted unit is g/dL.

## 4. Import, files and reproducibility

Commands (run inside `frontend/web`, Node 20 or newer, no dependencies):

```
node scripts/osdr/discover.mjs   # search + shortlist file listings -> data/manifests/osdr-discovery.json
node scripts/osdr/import.mjs     # download, hash, parse, write manifests and processed JSON
```

The scripts only contact `https://` hosts on an allow list (osdr.nasa.gov, visualization.osdr.nasa.gov, api.nasa.gov, science.nasa.gov, www.nasa.gov). The OSDR download endpoint answers with a redirect to its storage bucket `genelab-alsda-repo-prod.s3.amazonaws.com`; that host is accepted only as a redirect target issued by osdr.nasa.gov, never as a starting URL. Downloaded files are untrusted data: they are hashed and parsed as text only, never executed.

| Path | Content |
| --- | --- |
| `data/raw/<OSD>/` | original CSV byte for byte, plus `osdr-meta.json` and `osdr-files.json` (API responses as received) |
| `data/manifests/<OSD>.json` | DatasetRecord (PROJECT_MASTER 6.5 fields), file list with URL, size, SHA-256 and download time, API endpoints, assay protocol text, quality counts, discrepancies |
| `data/manifests/import-log.json` | last import job id and hashes |
| `data/processed/<OSD>.observations.json` | long format, one row per source row: subject, sex, analyte, unit, value, lab range, time point, phase, days relative to launch or return, `data_origin: REAL_PUBLIC` |
| `frontend/web/src/data/<OSD>.json` | compact panel for the UI (about 25 KB each): subjects, ordered time points, analytes with values per subject and time point, DERIVED group means |
| `frontend/web/src/data/osdr.ts` | typed loader (lazy `import()`), plain-language analyte descriptions |

Parser rules (`ahi-osdr-import 1.0.0`):
- Values are kept exactly as reported. Non numeric values (22 cells: 21 `NA` for BUN/creatinine ratio, 1 total bilirubin) stay null with the raw text; nothing is imputed.
- Time point labels are kept as in the source (`L-92`, `R+1`). `L-n` is read as n days before launch and `R+n` as n days after return, which is how the study description uses them.
- Analyte name variants such as `HEMOGLOBIN (FEMALE)` are merged with `HEMOGLOBIN` only when the unit is identical (the script fails on mixed units); the source names are listed in the UI.
- Subject sex in the file is checked against the ISA sample metadata; the import fails if they disagree or if any subject is not Homo sapiens.
- The two eGFR rows (race based equations) are kept in raw and long format files but not displayed.
- Group means are `DERIVED` (arithmetic mean of subjects with a value at that time point, sexes pooled) and are labeled as such.
- Lab reference ranges are the ranges the testing lab printed in the file. They are not NASA limits and AHI does not use them for status or alerts.

Quality summary: CBC 553 of 560 expected cells present (7 missing rows, mostly MCH and MCHC); CMP 17 displayed analytes, BUN/creatinine ratio mostly `NA` in the source.

## 5. License and access

- The study metadata has no license field: **license not stated**. Recorded as `license: null`.
- Access: both files were downloaded anonymously from the public OSDR API. The OSDR FAQ states that most data are accessible without authentication and that studies containing astronaut derived data have publicly accessible processed data, while sequence data are controlled access. Only processed tabular files were used; no controlled access data was requested or touched.
- Ethics (PROJECT_MASTER 17): subject codes are the source pseudonyms; no attempt is made to link them to named people. Data from other people is never merged into the simulated crew.

## 6. Limitations and items still to validate

- Four people, one 3 day commercial flight. Not representative of long duration ISS or exploration crews; no statistical claim can be made.
- No in-flight samples in these files (only ground time points). The UI breaks the lines across the flight.
- OSD-575's description lists post-flight time points R+1, R+45, R+82, but the CMP file and sample list also contain R+194. Shown as found in the file and flagged in the manifest.
- Fasting status for glucose is not stated. Age is not stated. Sample collection time of day is not stated.
- Multiplex cytokine panels (OSD-575 Eve and Alamar, OSD-656 urine) were not imported; they are normalized relative values and would need careful explanation.
- Not yet validated: NASA RadLab dosimetry coverage, NASA Life Sciences Portal (NLSP) resources, Standard Measures datasets. None was assumed to have a usable public API.
- OSDR search does not index every study (OSD-575 and OSD-656 were missing from search results), so this inventory may miss relevant studies.
- These datasets are reference only: they do not calibrate baselines, train models or set thresholds in the AHI engine.

## 7. NASA EDA: ISS cabin environment and radiation dose (added 2026-11-15)

| Field | Value |
| --- | --- |
| Source and URL | NASA OSDR Environmental Data Application, https://visualization.osdr.nasa.gov/eda/ ; REST API documented at https://visualization.osdr.nasa.gov/eda/api_reference |
| Date of consultation | 2026-11-15 |
| Organism and population | None: ISS cabin environment during rodent (RR) and plant (APEX, VEG) payload missions. Not crew data |
| Population type | NOT_APPLICABLE (subject_id CABIN) |
| Missions and phases | 24 missions listed; telemetry with ISS CO2 in 10 (RR-1, 3, 5, 6, 7, 9, 10, 12, 19, 23); daily radiation in 12. All values are IN_FLIGHT (ISS); payload phase kept in metadata |
| Metrics and units | Temp_degC_ISS (degC), RH_percent_ISS (%), CO2_ppm_ISS (ppm), radiation GCR, SAA and total in mGy/day, absorbed dose in water converted from silicon, preliminary SRAG NASA-JSC analysis |
| Frequency and period | Telemetry 1 to 10 min, 2014 to 2024; radiation daily |
| Files, size and format | JSON from the API, one telemetry and one radiation file per mission in data/raw/EDA/ (about 150 MB total); SHA-256 per file in data/manifests/EDA.json |
| License and access | Public, anonymous; license not stated. *_ground columns (ground control cages) excluded |
| Quality | RR-18 has 1434 RH values above 100% (flagged QUESTIONABLE). RR-4, 8, 17, 22, VEG-01B return no telemetry; APEX and VEG-01A, 01C return rows with empty ISS columns |
| AHI metrics fed | CO2, CABIN_TEMPERATURE, RELATIVE_HUMIDITY, RADIATION_DOSE_RATE (REAL_PUBLIC), RADIATION_DOSE (DERIVED running sum) |
| Decision | Chosen. Full replay for RR-7 (2018, 76 days of dose) and RR-12 (2019, complete) in data/processed/EDA-<mission>.observations.json; daily summary for every mission in data/processed/EDA.daily.json |
| Limitations | Historical replay, never live. Cabin values are not crew exposure. activity context is unknown (null). Radiation is preliminary analysis per the source |

Thresholds, calibration ranges and the full workbook: data/references/ and data/AHI_dados_reais_publicos.xlsx.
