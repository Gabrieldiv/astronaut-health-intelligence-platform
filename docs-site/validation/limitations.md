---
title: Limitations & Known Issues
description: Every known limitation of the Astronaut Health Intelligence Platform, from data and science to engine, product, platform and documentation, with its impact and where it is tracked.
status: IMPLEMENTED
verified: 2026-11-14
---

# Limitations & Known Issues

The canonical list of what the Astronaut Health Intelligence Platform (AHI) cannot do or does not do well yet. Each item says why it matters and where the fix, if any, is tracked.

## Data and science

| Limitation | Impact | Tracked in |
| --- | --- | --- |
| All crew device data is simulated | No statement about real physiology can be made | [Roadmap](../resources/roadmap) (calibration, real replays) |
| The simulator is not calibrated against published ranges | Values are plausible, not referenced | [Roadmap](../resources/roadmap) |
| Real data is limited to two Inspiration4 lab panels (4 people, 3 day flight, no in-flight samples) | Not representative of long duration crews; reference only | [Dataset catalog](../data/dataset-catalog#limitations) |
| No public continuous astronaut telemetry exists | Vitals cannot become real through public data | [NASA data sources](../data/sources) |
| NASA RadLab returned HTTP 500 on 2026-11-14 | Real dosimetry not imported | [NASA data sources](../data/sources#nasa-radlab) |
| Eyes are not monitored (no SANS tracking) | One known spaceflight risk is absent from the body view | [Roadmap](../resources/roadmap) |

## Engine

| Limitation | Impact | Tracked in |
| --- | --- | --- |
| Thresholds, weights, timings and effect sizes are demo configuration | Not grounded in a cited standard | [Thresholds](../intelligence/thresholds) |
| Evaluation uses the same simulator that generated the data | Results show internal consistency only | [Validation strategy](./strategy) |
| Activity context comes from the schedule, not from sensors | A wrong context compares against the wrong baseline | [Personal baseline](../intelligence/personal-baseline#limitations) |
| Univariate detection plus three combined rules | Other multi signal patterns are missed | [Anomaly detection](../intelligence/anomaly-detection#limitations) |
| Risk score is not a calibrated probability | Must not be read as a likelihood | [Risk assessment](../intelligence/risk-assessment#limitations) |
| Forecasts assume recent conditions continue; intervals not calibrated | Short horizon guidance only | [Forecasting](../intelligence/forecasting#limitations) |
| What-if effect sizes are made up | Discussion aid, not evidence | [Recommendations](../intelligence/recommendations#limitations) |
| Correlation is reported as co-occurrence only | No causal inference | [Responsible use](../overview/responsible-use#correlation-is-not-causation) |
| Older mission days are synthesized | Long term trends before the history window are not observed data | [Mission features](../product/mission-features#mission-overview) |
| Self report is a simplified scale | Not a validated questionnaire | [Self-report](../intelligence/self-report-and-earth-link#limitations) |

## Product and platform

| Limitation | Impact | Tracked in |
| --- | --- | --- |
| No backend, database or persistence | State and audit trail are lost on reload | [Target architecture](../architecture/target-architecture) |
| No authentication or roles | Anyone with the page sees everything | [Target architecture](../architecture/target-architecture#role-based-access) |
| No flight surgeon review workflow | Ground replies are templates | [Roadmap](../resources/roadmap) |
| Earth link is a delay model only | No bandwidth, blackout or loss modeling | [Earth link](../intelligence/self-report-and-earth-link#earth-link) |
| App UI in English only | Portuguese is available in the docs, not in the app | |
| Desktop first | Best at 1440x900 or larger; phones are not a target | [Setup](../engineering/quick-start) |
| Requires WebGL and a capable GPU for the 3D body | Weak machines run slower | [Setup](../engineering/quick-start) |
| The web app is not hosted publicly yet | Judges must run it locally | [Roadmap](../resources/roadmap) |

## Quality

| Limitation | Impact | Tracked in |
| --- | --- | --- |
| No UI component tests and no end to end tests | UI regressions are caught by hand | [Testing strategy](../engineering/testing) |
| No formal accessibility audit or screen reader test | Measures exist in code but are unverified | [Design system](../product/design-system#accessibility-measures-in-the-code) |
| Performance figures are informal observations | Not a benchmark | [Results](./results#measured-performance) |

## Known discrepancies

- The OSD-575 description lists post-flight time points R+1, R+45 and R+82, but the file also contains R+194. Shown as found and flagged in the manifest.
- The OSDR search index missed OSD-575 and OSD-656; they were found through related study links.

## Next steps

- [Roadmap](../resources/roadmap)
- [Responsible use](../overview/responsible-use)
