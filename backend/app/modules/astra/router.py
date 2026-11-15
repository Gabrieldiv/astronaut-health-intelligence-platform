from fastapi import APIRouter

from app.modules.astra.schemas import DeviationRequest, DeviationResponse
from app.modules.astra.service import analyze

router = APIRouter(tags=["analytics"])


@router.post(
    "/analytics/deviation",
    response_model=DeviationResponse,
    summary="Daily deviation level of one person against their own baseline (ASTRA, statistical detectors)",
    description=(
        "Send the stay of one person so far: one record per day with the daily value of each metric and the mission phase. "
        "The person's own PRE_FLIGHT days form the baseline; the expected adaptation and the scale of healthy people come from "
        "a reference pack calibrated on NASA bed rest data (an analog, not spaceflight). Returns, per IN_FLIGHT and POST_FLIGHT day, "
        "LOW, MODERATE, HIGH or NO_DATA with the detectors that fired. Stateless: nothing is stored. "
        "Decision support only, never a diagnosis. Results are DERIVED."
    ),
)
def deviation(req: DeviationRequest) -> DeviationResponse:
    return analyze(req)
