// Portuguese (Brazil): machine assisted translation, pending native review.
import type { Messages } from '../en'
import catalog from './catalog'
import common from './common'
import shell from './shell'
import components from './components'
import crew from './crew'
import attention from './attention'
import alerts from './alerts'
import devices from './devices'
import crewview from './crewview'
import anatomy from './anatomy'
import mission from './mission'
import a11y from './a11y'
import assistant from './assistant'
import datasources from './datasources'
import timeline from './timeline'
import report from './report'
import checkin from './checkin'
import comms from './comms'
import whatif from './whatif'
import tour from './tour'
import stage from './stage'

const messages: Messages = {
  ...catalog,
  ...common,
  ...shell,
  ...components,
  ...crew,
  ...attention,
  ...alerts,
  ...devices,
  ...crewview,
  ...anatomy,
  ...mission,
  ...a11y,
  ...assistant,
  ...datasources,
  ...timeline,
  ...report,
  ...checkin,
  ...comms,
  ...whatif,
  ...tour,
  ...stage,
}
export default messages
