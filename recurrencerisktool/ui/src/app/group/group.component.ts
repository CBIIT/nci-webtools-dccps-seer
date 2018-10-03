import { Component, OnInit, ViewChild } from '@angular/core';
import { Router, NavigationStart } from '@angular/router';
import { FormBuilder, FormGroup, FormControl } from '@angular/forms';
import { MatPaginator, MatTableDataSource, MatSort} from '@angular/material';
import { TdFileService, IUploadOptions } from '@covalent/core/file';
import { environment } from '../../environments/environment';
import { RecurrenceRiskService } from '../../shared/services/recurrenceRisk.service';
import * as FileSaver from 'file-saver';

@Component({
  selector: 'rrt-group',
  templateUrl: './group.component.html',
  styleUrls: ['./group.component.scss']
})
export class GroupComponent implements OnInit {

  dataSource = new MatTableDataSource<any>([{},{},{}]);

  displayedColumns: string[] = [
    'link',
    'cure',
    'lambda',
    'theta',
    'surv_curemodel',
    'surv_notcured',
    'median_surv_notcured',
    's1_numerical',
    'G_numerical',
    'CI_numerical',
    's1_analytical',
    'G_analytical',
    'CI_analytical',
    'se_CI_analytical',
    'obs_surv',
    'obs_dist_surv'];

  columnsToDisplay: string[] = this.displayedColumns.slice();
  groupDataForm: FormGroup;

  followup: any = {
    max: 30,
    min: 1,
    step: 1,
    interval: 1
  };

  groupMetadata: any = {};

  isGroupDataLoading: boolean = false;

  @ViewChild(MatPaginator) paginator: MatPaginator;

  @ViewChild(MatSort) sort: MatSort;

  errorMsg: string = "";

  constructor(private fileUploadService: TdFileService,private formBuilder: FormBuilder,
    private riskService: RecurrenceRiskService,private router: Router) {
    this.groupDataForm = formBuilder.group({
      seerDictionaryFile: new FormControl(''),
      seerDataFile: new FormControl(''),
      canSurvDataFile: new FormControl(''),
      stageVariable: new FormControl(''),
      stageValue: new FormControl(''),
      adjustmentFactor: new FormControl('1'),
      yearsOfFollowUp: new FormControl('25')
    });

    this.groupDataForm.get('seerDictionaryFile').valueChanges.subscribe( file => {
      this.handleSeerDictionaryFileChange(file);
    });

    this.groupDataForm.get('seerDataFile').valueChanges.subscribe( file => {
      this.handleSeerDataFileChange(file);
    });

	  router.events.subscribe( (event) => {
      if (event instanceof NavigationStart) {
        this.riskService.setCurrentState('group', {
          data: this.dataSource.data,
          metadata: this.groupMetadata,
          form: this.groupDataForm.value
        });
	  	}
	  });
  }

  ngOnInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
	  let state = this.riskService.getCurrentState('group');
	  this.dataSource.data = state.data;
	  this.groupMetadata = state.metadata;
	  this.groupDataForm.patchValue(state.form, {emitEvent: false});
  }

  handleSeerDictionaryFileChange(file: File) {
    if(file) {
      this.loadSeerFormData();
    }
  }

  handleSeerDataFileChange(file: File) {
    if(file) {
      this.loadSeerFormData();
    }
  }

  handleSubmitData(downloadFlag: boolean) {
    let formData: FormData = new FormData();
    Object.keys(this.groupDataForm.controls).forEach(key => {
      formData.append(key,this.groupDataForm.get(key).value);
    });

    let headers = { 'accept': downloadFlag ?
      'text/csv' : 'application/json' }

    let options: IUploadOptions = {
      url: `${environment.apiUrl}/recurrence/groupData`,
      method: 'post',
      formData: formData,
      headers: headers
    };

    this.isGroupDataLoading = true;
    this.fileUploadService.upload(options).subscribe(
      (response) => {
        this.isGroupDataLoading = false;
        downloadFlag ?
          this.saveData(response) : this.displayData(response);
      },
      (err) => {
        this.errorMsg = err;
        this.groupDataForm.setErrors({'invalid':true});
        this.isGroupDataLoading = false;
        this.dataSource.data = [];
    });
  }

  onSubmit(downloadFlag: boolean = false) {
    //submit everything
    if(this.groupDataForm.invalid) {
      this.errorMsg = "All form fields are required."
      return false;
    } else {
      this.handleSubmitData(downloadFlag);
      return true;
    }
  }

  loadSeerFormData() {
    //upload files and get back metadata to fill in form inputs
    let dicFile = this.groupDataForm.get('seerDictionaryFile').value;
    let dataFile = this.groupDataForm.get('seerDataFile').value;
    let formData: FormData = new FormData();

    if( dicFile && dataFile) {
      formData.append('seerDictionaryFile', dicFile, dicFile.name);
      formData.append('seerDataFile', dataFile, dataFile.name);

      let options: IUploadOptions = {
        url: `${environment.apiUrl}/recurrence/groupMetadata`,
        method: 'post',
        formData: formData
       };

       this.fileUploadService.upload(options).subscribe(
         (response) => {
           let metadata = JSON.parse(response);
           this.groupMetadata = metadata;
           this.followup.max = this.groupMetadata.maxFollowUp[0];
         },
         (err) => {
           this.groupMetadata = {};
           this.followup.max = 30;
           this.errorMsg = "An error occurred with the submitted data, please make sure the form data is correct."
         });
     }
  }

  displayData(response) {
    const data = JSON.parse(response);
    this.dataSource.data = data;
  }

  saveData(response) {
    const blob = new Blob([response], { type: 'text/csv' });
    FileSaver.saveAs(blob, 'groupData.csv');
  }

  applyFilter(filterValue: string) {
      this.dataSource.filter = filterValue.trim().toLowerCase();
    }

  isNumber(value:any) {
    return !isNaN(value);
  }

  unboxNumber(value:any) {
    if( Array.isArray(value) ) {
      return (value.length > 0) ? value[0] : 'NA';
    } else {
      return value;
    }
  }
  
  valuesForVariable() : any[] {
    let variable = this.groupDataForm.get('stageVariable').value;	  
	  let values = this.groupMetadata['values'];
	  if(values) {
	  	return values[variable];
	  } else {
	  	return [];
	  }
  }

  getErrorMessage(): String {
    return this.errorMsg;
  }

}
