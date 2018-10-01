import { inject, async, ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { Router,NavigationStart } from '@angular/router';

import { GroupComponent } from './group.component';

import { ReactiveFormsModule,FormsModule } from '@angular/forms';
import { FlexLayoutModule } from '@angular/flex-layout';
import { DebugElement, Component } from '@angular/core';

import { CovalentFileModule, TdFileInputComponent, TdFileService } from '@covalent/core/file';
import { HelpComponent } from './help/help.component';
import { RecurrenceRiskService } from '../../shared/services/recurrenceRisk.service';
import { BrowserModule, By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { of, throwError } from 'rxjs';

import {
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

describe('GroupComponent', () => {
  let component: GroupComponent;
  let fixture: ComponentFixture<GroupComponent>;
  let debugElement: DebugElement;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ GroupComponent, HelpComponent, MockComponent ],
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
	  providers: [
	    RecurrenceRiskService
	  ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(GroupComponent);
    component = fixture.componentInstance;
    debugElement = fixture.debugElement;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should submit an invalid form for display' , () => {
    expect(component.groupDataForm.valid).toBeFalsy();
    expect(component.onSubmit()).toBeFalsy();
  });

  it('should submit an invalid form for download' , () => {
    expect(component.groupDataForm.valid).toBeFalsy();
    expect(component.onSubmit(true)).toBeFalsy();
  });
  
  it('should save state before navigate',async( inject([Router,RecurrenceRiskService],
    (router:Router,riskService:RecurrenceRiskService) => {
	  component.groupDataForm.patchValue({yearsOfFollowUp: '7'},{emitEvent: false});
	  fixture.detectChanges();
	  router.navigate(['/']);
	  fixture.detectChanges();
	  fixture.whenStable().then( () => {
		expect(riskService.form.yearsOfFollowUp).toBe('7');
	  });
  })));

  it('should set seer dictionary input file field' , async( () => {
    let loadSeerFormDataSpy = spyOn(component,'loadSeerFormData').and.callThrough();
    let fileInputComponents = debugElement.queryAll(By.directive(TdFileInputComponent));
    let fileInputComponent = fileInputComponents.find( (iel) => iel.attributes.formControlName == 'seerDictionaryFile' );
    expect(fileInputComponent).toBeTruthy();
    fileInputComponent.componentInstance.handleSelect([{}]);
    fixture.detectChanges();
    fixture.whenStable().then( () => {
      expect(loadSeerFormDataSpy).toHaveBeenCalled();
    });

  }) );

  it('should clear seer dictionary input file field' , async( () => {
    let loadSeerFormDataSpy = spyOn(component,'loadSeerFormData').and.callThrough();
    let fileInputComponents = debugElement.queryAll(By.directive(TdFileInputComponent));
    let fileInputComponent = fileInputComponents.find( (iel) => iel.attributes.formControlName == 'seerDictionaryFile' );
    expect(fileInputComponent).toBeTruthy();
    fileInputComponent.componentInstance.handleSelect(undefined);
    fixture.detectChanges();
    fixture.whenStable().then( () => {
      expect(loadSeerFormDataSpy).not.toHaveBeenCalled();
    });
  }) );

  it('should set seer data input file filed' , async( () => {
    let loadSeerFormDataSpy = spyOn(component,'loadSeerFormData').and.callThrough();
    let fileInputComponents = debugElement.queryAll(By.directive(TdFileInputComponent));
    let fileInputComponent = fileInputComponents.find( (iel) => iel.attributes.formControlName == 'seerDataFile' );
    expect(fileInputComponent).toBeTruthy();
    fileInputComponent.componentInstance.handleSelect([{}]);
    fixture.detectChanges();
    fixture.whenStable().then( () => {
      expect(loadSeerFormDataSpy).toHaveBeenCalled();
    });
  }) );

  it('should clear seer data input file filed' , async( () => {
    let loadSeerFormDataSpy = spyOn(component,'loadSeerFormData').and.callThrough();
    let fileInputComponents = debugElement.queryAll(By.directive(TdFileInputComponent));
    let fileInputComponent = fileInputComponents.find( (iel) => iel.attributes.formControlName == 'seerDataFile' );
    expect(fileInputComponent).toBeTruthy();
    fileInputComponent.componentInstance.handleSelect(undefined);
    fixture.detectChanges();
    fixture.whenStable().then( () => {
      expect(loadSeerFormDataSpy).not.toHaveBeenCalled();
     });
  }) );

  it('should load seer form meta data from dictionary and data' , async( inject( [TdFileService],(mockFileService: TdFileService) => {
      let loadSeerFormDataSpy = spyOn(component,'loadSeerFormData').and.callThrough();
      let uploadSpy = spyOn(mockFileService,'upload').and.returnValue(
        of('{ "variables": [], "maxFollowUp": [ 7 ] }'));
      let fileInputComponents = debugElement.queryAll(By.directive(TdFileInputComponent));
      let dicFileInputComponent = fileInputComponents.find( (iel) => iel.attributes.formControlName == 'seerDictionaryFile' );
      let dataFileInputComponent = fileInputComponents.find( (iel) => iel.attributes.formControlName == 'seerDataFile' );

      expect(dicFileInputComponent).toBeTruthy();
      expect(dataFileInputComponent).toBeTruthy();

      dicFileInputComponent.componentInstance.handleSelect([{}]);
      dataFileInputComponent.componentInstance.handleSelect([{}]);

      fixture.detectChanges();
      fixture.whenStable().then( () => {
        expect(loadSeerFormDataSpy).toHaveBeenCalled();
        expect(uploadSpy).toHaveBeenCalled();
        expect(component.followup.max).toBe(7);
       });
  })) );

  it('should load seer form meta data from dictionary and data with error' , async( inject( [TdFileService],(mockFileService: TdFileService) => {
      let loadSeerFormDataSpy = spyOn(component,'loadSeerFormData').and.callThrough();
      let uploadSpy = spyOn(mockFileService,'upload').and.returnValue(throwError( new Error('oops!')));
      let fileInputComponents = debugElement.queryAll(By.directive(TdFileInputComponent));
      let dicFileInputComponent = fileInputComponents.find( (iel) => iel.attributes.formControlName == 'seerDictionaryFile' );
      let dataFileInputComponent = fileInputComponents.find( (iel) => iel.attributes.formControlName == 'seerDataFile' );

      expect(dicFileInputComponent).toBeTruthy();
      expect(dataFileInputComponent).toBeTruthy();

      dicFileInputComponent.componentInstance.handleSelect([{}]);
      dataFileInputComponent.componentInstance.handleSelect([{}]);

      fixture.detectChanges();
      fixture.whenStable().then( () => {
        expect(loadSeerFormDataSpy).toHaveBeenCalled();
        expect(uploadSpy).toHaveBeenCalled();
        expect(component.followup.max).toBe(30);
        expect(component.groupMetadata).toEqual({});
       });
    })) );

    it('should update stage variable and in return update stage values', async( inject( [], () => {
      component.groupMetadata = {
        values : { 'var1': [ '1','2','3'] ,'var2': ['a','b','c'] },
        variables: ['var1','var2']
      };

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
        expect(component.groupDataForm.get('stageVariable').value).toBe('var2');
      });
    })) );

    it('should submit group data form correctly', async( inject( [TdFileService],(mockFileService: TdFileService) => {
     
      component.groupMetadata = {
        values : { 'var1': [ '1','2','3'] ,'var2': ['a','b','c'] },
        variables: ['var1','var2']
      };
      fixture.detectChanges();

      let uploadSpy = spyOn(mockFileService,'upload').and.returnValue(
              of('[{ "link" : "testlink","cure":"1","lambda":"2"}]'));
      spyOn(component,'loadSeerFormData').and.callFake( () => true);

      component.groupDataForm.setValue(
        {
          seerDictionaryFile: new File([],'dic'),
          seerDataFile:  new File([],'data'),
          canSurvDataFile: new File([],'surv'),
          stageVariable: 'var1',
          stageValue: '1',
          adjustmentFactor: '1',
          yearsOfFollowUp: '25'
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
     
      component.groupMetadata = {
        values : { 'var1': [ '1','2','3'] ,'var2': ['a','b','c'] },
        variables: ['var1','var2']
      };
      fixture.detectChanges();

      let uploadSpy = spyOn(mockFileService,'upload').and.returnValue(
              throwError(new Error('oops!')));
      spyOn(component,'loadSeerFormData').and.callFake( () => true);

      component.groupDataForm.setValue(
        {
          seerDictionaryFile: new File([],'dic'),
          seerDataFile:  new File([],'data'),
          canSurvDataFile: new File([],'surv'),
          stageVariable: 'var1',
          stageValue: '1',
          adjustmentFactor: '1',
          yearsOfFollowUp: '25'
        }
      );

      fixture.detectChanges();
      component.onSubmit(false);
      fixture.detectChanges();

      fixture.whenStable().then( () => {
        expect(component.dataSource.data.length).toBe(0);
      });

    })));

    it('should submit group data form correctly for download',
     async( inject( [TdFileService],(mockFileService: TdFileService) => {
      component.groupMetadata = {
        values : { 'var1': [ '1','2','3'] ,'var2': ['a','b','c'] },
        variables: ['var1','var2']
      };
      fixture.detectChanges();

      let uploadSpy = spyOn(mockFileService,'upload').and.returnValue(
              of('[{ "link" : "testlink","cure":"1","lambda":"2"}]'));
      let saveDataSpy = spyOn(component,'saveData').and.callThrough();

      spyOn(component,'loadSeerFormData').and.callFake( () => true);

      component.groupDataForm.setValue(
        {
          seerDictionaryFile: new File([],'dic'),
          seerDataFile:  new File([],'data'),
          canSurvDataFile: new File([],'surv'),
          stageVariable: 'var1',
          stageValue: '1',
          adjustmentFactor: '1',
          yearsOfFollowUp: '25'
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

    function findMatOptionFromSelectElement(matSelects: DebugElement[],key:string) {
      return matSelects.find( (el) => {
        let elText = el.query(By.css('.mat-option-text'));
        let text = elText.nativeElement.textContent;
        return text.replace(/\s/g, "") == key;
      });
    }


});
