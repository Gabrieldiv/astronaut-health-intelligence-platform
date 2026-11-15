"""Analytics module: server side parity path for the experimental multivariate detector.

The browser detector (frontend/web/src/engine/ml) is the OFFLINE path: it trains a small seeded
Isolation Forest per astronaut in TypeScript, so the app works with no server. This module is the
future SCALABLE path: the same idea (PCA whitening of standardized features, then an Isolation
Forest) with scikit-learn, for batch scoring, larger windows and model comparison on the server.

Experimental, machine learning. Decision support only: it scores how unusual a combination of
standardized signals is compared with the submitted training window. It never diagnoses and never
sets a status; the caller applies its own persistence rules before showing any flag.
"""
