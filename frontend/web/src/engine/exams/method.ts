/**
 * Method notes of the exam follow up (shown under the exam history). Kept in a leaf module so the
 * English locale can derive its keys from it without importing the whole exam book.
 */
import type { EngineMsg, ExamRegionId } from '../../types/domain'
import { msg } from '../msg'

/** Structured forms of EXAM_METHOD (engine/msg.ts). */
export const EXAM_METHOD_MSG: Record<ExamRegionId, EngineMsg> = { eyes: msg('exam.method.eyes'), ears: msg('exam.method.ears') }

export const EXAM_METHOD: Record<ExamRegionId, string> = {
  eyes: 'SANS monitoring as on the ISS (NASA OCHMO-MTB-001): pre-flight baseline, then eye exams on flight days 30 and 90 and 30 days before return. Status = change from your own pre-flight baseline, same eye. Simulated data.',
  ears: 'Hearing: pre-flight audiometry, then on-orbit hearing assessments (demo cadence: every 30 days). Status = threshold shift from your own pre-flight baseline (NASA HSRB shift metric). Noise: crew worn dosimeter, one simulated reading per day. Simulated data.',
}
