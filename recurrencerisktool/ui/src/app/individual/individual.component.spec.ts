import { inject, async, ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { Router,NavigationStart } from '@angular/router';

import { IndividualComponent } from './individual.component';

import { ReactiveFormsModule,FormsModule } from '@angular/forms';
import { FlexLayoutModule } from '@angular/flex-layout';
import { DebugElement, Component, NgZone } from '@angular/core';

import { CovalentFileModule, TdFileInputComponent, TdFileService } from '@covalent/core/file';
import { IndividualHelpComponent } from './individual-help/individual-help.component';
import { RecurrenceRiskService } from '../../shared/services/recurrenceRisk.service';
import { BrowserModule, By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { of, throwError } from 'rxjs';

import {
  MatToolbarModule,
  MatListModule,
  MatButtonModule,
  MatCardModule,
  MatButtonToggleModule,
  MatFormFieldModule,
  MatInputModule,
  MatSelectModule,
  MatSliderModule,
  MatIconModule,
  MatDividerModule,
  MatTabsModule,
  MatTableModule,
  MatPaginatorModule,
  MatProgressBarModule,
  MatSortModule
} from '@angular/material';

@Component({
  selector: 'mock-component',
  template: ''
})
class MockComponent {
}

function findMatOptionFromSelectElement(matSelects: DebugElement[],key:string) {
  return matSelects.find( (el) => {
    let elText = el.query(By.css('.mat-option-text'));
    let text = elText.nativeElement.textContent;
    return text.replace(/\s/g, "") == key;
  });
}

describe('IndividualComponent', () => {
  let component: IndividualComponent;
  let fixture: ComponentFixture<IndividualComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ IndividualComponent, IndividualHelpComponent, MockComponent ],
      imports: [
        BrowserModule,
        NoopAnimationsModule,
        ReactiveFormsModule,
        FormsModule,
        FlexLayoutModule,
        CovalentFileModule,
        MatCardModule,
        MatListModule,
        MatButtonModule,
        MatButtonToggleModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatSliderModule,
        MatDividerModule,
        MatIconModule,
        MatTabsModule,
        MatTableModule,
        MatPaginatorModule,
        MatProgressBarModule,
        MatSortModule,
        RouterTestingModule.withRoutes([
          { 'path':'group', component: MockComponent},
          { 'path':'individual',component: MockComponent}])
      ],
     providers: [ RecurrenceRiskService ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(IndividualComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should update stage variable and in return update stage values', async( inject( [RecurrenceRiskService],
    (riskService:RecurrenceRiskService) => {
    component.individualMetadata = {
      values : { 'var1': [ '1','2','3'] ,'var2': ['a','b','c'] },
      variables: ['var1','var2']
    };

    component.dataSource.data = [{link:'test',cure: [0],lambda: 0},{},{}];
    fixture.detectChanges();

    let matSelectInput = fixture.debugElement.query(By.css('mat-select[formControlName="stageVariable"]'));
    matSelectInput.nativeElement.click();
    fixture.detectChanges();

    let matOptionInputs = matSelectInput.queryAll(By.css('mat-option'));
    expect(matOptionInputs.length).toBeGreaterThan(0);

    let matOptionInput = findMatOptionFromSelectElement(matOptionInputs,'var2');

    matOptionInput.nativeElement.click();
    fixture.detectChanges();

     fixture.whenStable().then( () => {
       expect(component.individualDataForm.get('stageVariable').value).toBe('var2');
     });
  })) );

});
