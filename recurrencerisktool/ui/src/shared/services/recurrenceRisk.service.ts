import { Injectable } from '@angular/core';

@Injectable({
 providedIn: 'root',
})
export class RecurrenceRiskService {
	
	private _form: any;
	private _data: any[];
	private _metadata: any;
	
	constructor() {
		this._metadata = {};
		this._form = {};
		this._data = [{},{},{}];
	}
	
	get form(): any {
		return this._form;
	}
	
	set form(form:any) {
	  this._form = form;	
	}
	
	get data(): any[] {
		return this._data;
	}
	
	set data(data:any[]) {
		this._data = data;
	}
	
	get metadata(): any {
		return this._metadata;
	}
	
	set metadata(metadata:any) {
		this._metadata = metadata;
	}
}