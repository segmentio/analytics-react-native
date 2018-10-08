import { Analytics } from './analytics'

export default new Analytics.Client().middleware(payload => {
	payload.next({
		...payload.context,
		test: ''
	})

	switch (payload.type) {
		case 'alias':
			return payload.next(payload.context, {
				newId: ''
			})
	}
})
