from fastapi import APIRouter

from app.modules.analytics.schemas import MultivariateRequest, MultivariateResponse
from app.modules.analytics.service import score_multivariate

router = APIRouter(tags=["analytics"])


@router.post(
    "/analytics/multivariate",
    response_model=MultivariateResponse,
    summary="Score standardized feature vectors with a seeded Isolation Forest (experimental, machine learning)",
    description=(
        "Server parity path of the browser detector (frontend/web/src/engine/ml), which stays the offline path. "
        "Fits PCA whitening and a seeded scikit-learn IsolationForest on the submitted training window "
        "(the person's own baseline window of robust z scores), then returns a score, the personal threshold "
        "and per feature deviation contributions for each scored vector. Stateless: nothing is stored. "
        "Decision support only, never a diagnosis or a status."
    ),
)
def multivariate(req: MultivariateRequest) -> MultivariateResponse:
    return score_multivariate(req)
