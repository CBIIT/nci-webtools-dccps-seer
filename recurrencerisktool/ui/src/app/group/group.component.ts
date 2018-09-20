import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, FormControl } from '@angular/forms';
import {MatPaginator, MatTableDataSource} from '@angular/material';
import { TdFileService, IUploadOptions } from '@covalent/core/file';
import { environment } from '../../environments/environment';

@Component({
  selector: 'rrt-group',
  templateUrl: './group.component.html',
  styleUrls: ['./group.component.scss']
})
export class GroupComponent implements OnInit {

  dataSource = new MatTableDataSource<any>([]);

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

  stageVariables: string[] = [];
  distantStageValues: string[] = [];

  followup: any = {
    max: 30,
    min: 1,
    step: 1,
    interval: 1
  };

  groupMetadata: any;

  isGroupDataLoading: boolean = false;

  @ViewChild(MatPaginator) paginator: MatPaginator;

  constructor(private fileUploadService: TdFileService,private formBuilder: FormBuilder) {
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

    this.groupDataForm.get('stageVariable').valueChanges.subscribe( stageVar => {
       this.distantStageValues = this.groupMetadata['values'][stageVar];
    })

  }

  ngOnInit() {
    this.dataSource.paginator = this.paginator;
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

  onDownload() {
    console.log("download");
  }

  onSubmit() {
    //submit everything
    if(this.groupDataForm.invalid) {
      console.log("Form is invalid")
      return;
    } else {

      let formData: FormData = new FormData();
      Object.keys(this.groupDataForm.controls).forEach(key => {
        formData.append(key,this.groupDataForm.get(key).value);
      });

      let options: IUploadOptions = {
        url: `${environment.apiUrl}/recurrence/groupData`,
        method: 'post',
        formData: formData
      };

      this.isGroupDataLoading = true;
      this.fileUploadService.upload(options).subscribe(
        (response) => {
          this.isGroupDataLoading = false;
          let data = JSON.parse(response);
          this.dataSource.data = data;
        },
        (err) => {
          console.log(err);
          this.isGroupDataLoading = false;
          this.dataSource.data = [];
      });
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
           this.stageVariables = this.groupMetadata.variables;
           this.followup.max = this.groupMetadata.maxFollowUp[0];
         },
         (err) => {
           this.groupMetadata = {};
           this.stageVariables = [];
           this.distantStageValues = [];
           this.followup.max = 30;
         });
     }
  }

}
