import { Injectable } from '@angular/core';

@Injectable({
 providedIn: 'root',
})
export class RecurrenceRiskService {

	private _currentState: any = {
	  group: { form: {}, metadata: {}, data: [{},{},{}]  } ,
	  individual: { form: {}, metadata: {}, data: [{},{},{}] }
	 };

	constructor() {
	}

	setCurrentState(key: string,state: any) {
    this._currentState[key] = state;
	}

  getCurrentState(key: string) {
    return this._currentState[key];
	}
}
