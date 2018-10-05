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
  let debugElement: DebugElement;

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
    debugElement = fixture.debugElement;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should submit an invalid form for display' , () => {
    expect(component.individualDataForm.valid).toBeFalsy();
    expect(component.onSubmit()).toBeFalsy();
  });

  it('should submit an invalid form for download' , () => {
    expect(component.individualDataForm.valid).toBeFalsy();
    expect(component.onSubmit(true)).toBeFalsy();
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

  it('should load seer form meta data from csv' , async( inject( [TdFileService],(mockFileService: TdFileService) => {
    let loadSeerFormDataSpy = spyOn(component,'loadSeerFormData').and.callThrough();
    let uploadSpy = spyOn(mockFileService,'upload').and.returnValue(
      of('{ "variables": [ "var1"] }'));
    let fileInputComponents = debugElement.queryAll(By.directive(TdFileInputComponent));
    let dataFileInputComponent = fileInputComponents.find( (iel) => iel.attributes.formControlName == 'seerCSVDataFile' );

    expect(dataFileInputComponent).toBeTruthy();

    dataFileInputComponent.componentInstance.handleSelect([{}]);

    fixture.detectChanges();
    fixture.whenStable().then( () => {
      expect(loadSeerFormDataSpy).toHaveBeenCalled();
      expect(uploadSpy).toHaveBeenCalled();
      expect(component.individualMetadata.variables[0]).toBe('var1');
     });
  })) );

  it('should submit individual data form correctly', async( inject( [TdFileService],(mockFileService: TdFileService) => {
    component.individualMetadata = {
      values : { 'var1': [ '1','2','3'] ,'var2': ['a','b','c'] },
      variables: ['var1','var2']
    };
    fixture.detectChanges();

    let uploadSpy = spyOn(mockFileService,'upload').and.returnValue(
            of('[{ "link" : "testlink","cure":"1","lambda":"2"}]'));
    spyOn(component,'loadSeerFormData').and.callFake( () => true);

    component.individualDataForm.setValue(
      {
        seerCSVDataFile: new File([],'data'),
        strata: ['a','b','c'],
        covariates: ['d','e','f'],
        timeVariable: 'var1',
        eventVariable: 'event',
        distribution: 'link',
        stageVariable: 'stagevar',
        distantStageValue: 'distantval',
        adjustmentFactor: '1.06',
        yearsOfFollowUp: '2'
      }
    );

    fixture.detectChanges();
    component.onSubmit(false);
    fixture.detectChanges();
    fixture.whenStable().then( () => {
      expect(component.dataSource.data.length).toBe(1);
      expect(component.dataSource.data[0]['link']).toBe('testlink');
      expect(component.dataSource.data[0]['cure']).toBe('1');
      expect(component.dataSource.data[0]['lambda']).toBe('2');
    });

  })));

  it('should submit group data form correctly but server error',
    async( inject( [TdFileService],(mockFileService: TdFileService) => {

    component.individualMetadata = {
      values : { 'var1': [ '1','2','3'] ,'var2': ['a','b','c'] },
      variables: ['var1','var2']
    };
    fixture.detectChanges();

    let uploadSpy = spyOn(mockFileService,'upload').and.returnValue(
            throwError(new Error('oops!')));
    spyOn(component,'loadSeerFormData').and.callFake( () => true);

    component.individualDataForm.setValue(
      {
        seerCSVDataFile: new File([],'data'),
        strata: ['a','b','c'],
        covariates: ['d','e','f'],
        timeVariable: 'time',
        eventVariable: 'event',
        distribution: 'link',
        stageVariable: 'stagevar',
        distantStageValue: 'distantval',
        adjustmentFactor: '1.06',
        yearsOfFollowUp: '2'
      }
    );

    fixture.detectChanges();
    component.onSubmit(false);
    fixture.detectChanges();

    fixture.whenStable().then( () => {
      expect(component.dataSource.data.length).toBe(0);
    });

  })));

  it('should submit individual data form correctly for download', async( inject( [TdFileService],(mockFileService: TdFileService) => {
    component.individualMetadata = {
      values : { 'var1': [ '1','2','3'] ,'var2': ['a','b','c'] },
      variables: ['var1','var2']
    };
    fixture.detectChanges();

    let uploadSpy = spyOn(mockFileService,'upload').and.returnValue(
            of('[{ "link" : "testlink","cure":"1","lambda":"2"}]'));
    spyOn(component,'loadSeerFormData').and.callFake( () => true);
    let saveDataSpy = spyOn(component,'saveData').and.callThrough();

    component.individualDataForm.setValue(
      {
        seerCSVDataFile: new File([],'data'),
        strata: ['a','b','c'],
        covariates: ['d','e','f'],
        timeVariable: 'time',
        eventVariable: 'event',
        distribution: 'link',
        stageVariable: 'stagevar',
        distantStageValue: 'distantval',
        adjustmentFactor: '1.06',
        yearsOfFollowUp: '2'
      }
    );

    fixture.detectChanges();
    component.onSubmit(true);
    fixture.detectChanges();
    fixture.whenStable().then( () => {
      //3 is the default table
      expect(component.dataSource.data.length).toBe(3);
      expect(saveDataSpy).toHaveBeenCalled();
    });

  })));

});
