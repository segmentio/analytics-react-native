import analytics from '..'
import { Analytics } from '../analytics'

jest.mock('../bridge')

it('exports an instance of Analytics.Client', () =>
	expect(analytics).toBeInstanceOf(Analytics.Client))
