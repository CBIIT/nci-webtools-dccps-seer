import { inject, async, ComponentFixture, TestBed } from '@angular/core/testing';
import { DebugElement, Component, ViewChild } from '@angular/core'
import { Location } from '@angular/common';
import { RouterTestingModule } from '@angular/router/testing';
import { HeaderComponent } from './header.component';
import { Router, RouterLink } from '@angular/router';
import { By } from '@angular/platform-browser'

import {
  MatToolbarModule,
  MatDividerModule,
  MatButtonToggleModule,
  MatButtonToggle
} from '@angular/material';


@Component({
  selector: 'mock-component',
  template: '<rrt-header></rrt-header>'
})
class MockComponent {
  @ViewChild(HeaderComponent)
  public headerComponent: HeaderComponent;
}


describe('HeaderComponent', () => {
  let component: HeaderComponent;
  let fixture: ComponentFixture<HeaderComponent>;

  beforeEach(async(() => {

    TestBed.configureTestingModule({
      declarations: [
       HeaderComponent,
       MockComponent
      ],
      imports: [
        MatToolbarModule,
        MatDividerModule,
        MatButtonToggleModule,
        RouterTestingModule.withRoutes([
         { 'path':'group', component: MockComponent},
         { 'path':'individual',component: MockComponent}]) ],
    })
    .compileComponents();

  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(HeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should be able to handle default selection', () => {
    let mockFixture = TestBed.createComponent(MockComponent);
    let mockComponent = mockFixture.componentInstance;
    mockComponent.headerComponent.defaultSelection = 'individual';
    mockFixture.detectChanges();
    let checkedButtonToggleDebugElement = mockFixture.debugElement.query(By.css('.mat-button-toggle-checked'));
    expect(checkedButtonToggleDebugElement.attributes['value']).toEqual('individual');

  });

  it('should be able to navigate to Individual', async( inject([Router, Location], (router: Router, location: Location) => {
      let buttonToggleDebugElements = fixture.debugElement.queryAll(By.directive(MatButtonToggle));
      let buttonToggleNativeElements = buttonToggleDebugElements.map( (debugEl) => debugEl.nativeElement);

      let groupButtonToggleNativeElement =
        buttonToggleNativeElements.find( (elem) => elem.getAttribute('value') === 'individual');

      expect(groupButtonToggleNativeElement.getAttribute('value')).toBe('individual');

      groupButtonToggleNativeElement.click();

      fixture.whenStable().then( () => {
        expect(location.path()).toEqual('/individual');
      });

    })));

  it('should be able to navigate to group', async( inject([Router, Location], (router: Router, location: Location) => {
    let buttonToggleDebugElements = fixture.debugElement.queryAll(By.directive(MatButtonToggle));
    let buttonToggleNativeElements = buttonToggleDebugElements.map( (debugEl) => debugEl.nativeElement);

    let groupButtonToggleNativeElement =
      buttonToggleNativeElements.find( (elem) => elem.getAttribute('value') === 'group');

    expect(groupButtonToggleNativeElement.getAttribute('value')).toBe('group');

    groupButtonToggleNativeElement.click();

    fixture.whenStable().then( () => {
      expect(location.path()).toEqual('/group');
    });
  })));

});
