import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule,FormsModule } from '@angular/forms';
import { FlexLayoutModule } from '@angular/flex-layout';
import { RouterModule, Routes } from '@angular/router';
import { CovalentFileModule } from '@covalent/core/file';
import {
  MatToolbarModule,
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
import { AppComponent } from './app.component';
import { HeaderComponent,FooterComponent } from './common';
import { GroupComponent } from './group/group.component';
import { IndividualComponent } from './individual/individual.component';
import { GroupHelpComponent } from './group/group-help/group-help.component';
import { IndividualHelpComponent } from './individual/individual-help/individual-help.component';

const appRoutes: Routes = [
  { path: 'individual', component: IndividualComponent },
  { path: 'group', component: GroupComponent },
  { path: '',   redirectTo: '/group', pathMatch: 'full' }
];

@NgModule({
  declarations: [
    AppComponent,
    HeaderComponent,
    FooterComponent,
    GroupComponent,
    IndividualComponent,
    GroupHelpComponent,
    IndividualHelpComponent
  ],
  imports: [
    RouterModule.forRoot(
      appRoutes,
      { enableTracing: false } // <-- debugging purposes only
    ),
    BrowserModule,
    BrowserAnimationsModule,
    ReactiveFormsModule,
    FormsModule,
    FlexLayoutModule,
    CovalentFileModule,
    MatToolbarModule,
    MatCardModule,
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
    MatSortModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
