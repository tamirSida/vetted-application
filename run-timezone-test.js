#!/usr/bin/env node

// Simple test runner for timezone conversion
// This simulates the database operations and tests the timezone logic

class TimezoneConverter {
  // Get ET timezone offset for a given date (handles DST)
  getETOffset(date) {
    const year = date.getFullYear();
    
    // Calculate 2nd Sunday in March
    const march = new Date(year, 2, 1); // March 1st
    const daysUntilFirstSunday = (7 - march.getDay()) % 7;
    const firstSundayMarch = 1 + daysUntilFirstSunday;
    const secondSundayMarch = firstSundayMarch + 7;
    const edtStart = new Date(year, 2, secondSundayMarch, 2, 0, 0); // 2 AM
    
    // Calculate 1st Sunday in November
    const november = new Date(year, 10, 1); // November 1st
    const daysUntilFirstSundayNov = (7 - november.getDay()) % 7;
    const firstSundayNovember = 1 + daysUntilFirstSundayNov;
    const edtEnd = new Date(year, 10, firstSundayNovember, 2, 0, 0); // 2 AM
    
    // Check if date is within EDT period
    const isEDT = date >= edtStart && date < edtEnd;
    
    return isEDT ? '-04:00' : '-05:00';
  }

  // Extract time for form display (convert from UTC back to ET)
  extractTimeInET(date) {
    const etTime = date.toLocaleString('en-US', {
      timeZone: 'America/New_York',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    return etTime;
  }

  // Extract date for form display (convert from UTC back to ET)
  extractDateInET(date) {
    const etDate = date.toLocaleDateString('en-CA', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    return etDate;
  }

  convertETToUTC(dateString, timeString) {
    if (!dateString || !timeString) {
      throw new Error('Both date and time are required');
    }
    
    // Parse date components
    const [year, month, day] = dateString.split('-').map(Number);
    const [hours, minutes] = timeString.split(':').map(Number);
    
    // Create date treating the input as ET timezone
    const etOffset = this.getETOffset(new Date(year, month - 1, day));
    const etISOString = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}T${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00.000${etOffset}`;
    
    return new Date(etISOString);
  }

  convertETDateToUTC(dateString) {
    const [year, month, day] = dateString.split('-').map(Number);
    return this.convertETToUTC(dateString, '00:00');
  }

  convertUTCToET(utcDate) {
    const etDateString = this.extractDateInET(utcDate);
    const etDate = new Date(etDateString);
    
    return {
      date: etDate,
      time: this.extractTimeInET(utcDate)
    };
  }
}

// Mock database operations
class MockDatabase {
  constructor() {
    this.cohorts = new Map();
  }

  async saveCohort(cohort) {
    const id = 'test-cohort-' + Date.now();
    const savedCohort = {
      ...cohort,
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.cohorts.set(id, savedCohort);
    console.log('💾 SAVED TO DB:', {
      id,
      applicationStartDate: savedCohort.applicationStartDate.toISOString(),
      applicationEndDate: savedCohort.applicationEndDate.toISOString(),
      programStartDate: savedCohort.programStartDate.toISOString(),
      programEndDate: savedCohort.programEndDate.toISOString()
    });
    
    return savedCohort;
  }

  async getCohort(id) {
    const cohort = this.cohorts.get(id);
    if (cohort) {
      console.log('📖 RETRIEVED FROM DB:', {
        id: cohort.id,
        applicationStartDate: cohort.applicationStartDate.toISOString(),
        applicationEndDate: cohort.applicationEndDate.toISOString(),
        programStartDate: cohort.programStartDate.toISOString(),
        programEndDate: cohort.programEndDate.toISOString()
      });
    }
    return cohort;
  }

  async updateCohort(id, updates) {
    const existing = this.cohorts.get(id);
    if (existing) {
      const updated = { ...existing, ...updates, updatedAt: new Date() };
      this.cohorts.set(id, updated);
      console.log('✏️  UPDATED IN DB:', {
        id,
        applicationStartDate: updated.applicationStartDate.toISOString(),
        applicationEndDate: updated.applicationEndDate.toISOString(),
        programStartDate: updated.programStartDate.toISOString(),
        programEndDate: updated.programEndDate.toISOString()
      });
      return updated;
    }
    return null;
  }
}

// Main test function
async function runTimezoneTest() {
  console.log('\n🧪 === COMPREHENSIVE TIMEZONE TEST ===\n');

  const converter = new TimezoneConverter();
  const db = new MockDatabase();

  // Test data - ET form inputs
  const etFormData = {
    applicationStartDate: '2025-11-18',  // ET date
    applicationStartTime: '13:45',       // ET time (1:45 PM ET)
    applicationEndDate: '2025-11-19',    // ET date  
    applicationEndTime: '15:28',         // ET time (3:28 PM ET)
    programStartDate: '2025-11-19',      // ET date
    programEndDate: '2025-11-22'         // ET date
  };

  console.log('📝 STEP 1: Starting with ET form data:');
  console.log('  App Start:', etFormData.applicationStartDate, etFormData.applicationStartTime);
  console.log('  App End:', etFormData.applicationEndDate, etFormData.applicationEndTime);
  console.log('  Program Start:', etFormData.programStartDate);
  console.log('  Program End:', etFormData.programEndDate);

  // Convert ET to UTC for database storage
  console.log('\n🔄 STEP 2: Converting ET to UTC for database...');
  const applicationStartUTC = converter.convertETToUTC(etFormData.applicationStartDate, etFormData.applicationStartTime);
  const applicationEndUTC = converter.convertETToUTC(etFormData.applicationEndDate, etFormData.applicationEndTime);
  const programStartUTC = converter.convertETDateToUTC(etFormData.programStartDate);
  const programEndUTC = converter.convertETDateToUTC(etFormData.programEndDate);

  console.log('  App Start UTC:', applicationStartUTC.toISOString());
  console.log('  App End UTC:', applicationEndUTC.toISOString());
  console.log('  Program Start UTC:', programStartUTC.toISOString());
  console.log('  Program End UTC:', programEndUTC.toISOString());

  // Save to database
  console.log('\n💾 STEP 3: Saving to database...');
  const cohortData = {
    name: 'Test Cohort Fall 2025',
    applicationStartDate: applicationStartUTC,
    applicationEndDate: applicationEndUTC,
    programStartDate: programStartUTC,
    programEndDate: programEndUTC,
    isActive: true,
    webinars: []
  };

  const savedCohort = await db.saveCohort(cohortData);

  // Retrieve from database
  console.log('\n📖 STEP 4: Retrieving from database...');
  const retrievedCohort = await db.getCohort(savedCohort.id);

  // Convert UTC back to ET for editing
  console.log('\n🔄 STEP 5: Converting UTC back to ET for editing...');
  const editFormData = {
    applicationStartDate: converter.extractDateInET(retrievedCohort.applicationStartDate),
    applicationStartTime: converter.extractTimeInET(retrievedCohort.applicationStartDate),
    applicationEndDate: converter.extractDateInET(retrievedCohort.applicationEndDate),
    applicationEndTime: converter.extractTimeInET(retrievedCohort.applicationEndDate),
    programStartDate: converter.extractDateInET(retrievedCohort.programStartDate),
    programEndDate: converter.extractDateInET(retrievedCohort.programEndDate)
  };

  console.log('  App Start:', editFormData.applicationStartDate, editFormData.applicationStartTime);
  console.log('  App End:', editFormData.applicationEndDate, editFormData.applicationEndTime);
  console.log('  Program Start:', editFormData.programStartDate);
  console.log('  Program End:', editFormData.programEndDate);

  // Verify round-trip accuracy
  console.log('\n✅ STEP 6: Verifying round-trip accuracy...');
  const matches = {
    appStartDate: editFormData.applicationStartDate === etFormData.applicationStartDate,
    appStartTime: editFormData.applicationStartTime === etFormData.applicationStartTime,
    appEndDate: editFormData.applicationEndDate === etFormData.applicationEndDate,
    appEndTime: editFormData.applicationEndTime === etFormData.applicationEndTime,
    progStartDate: editFormData.programStartDate === etFormData.programStartDate,
    progEndDate: editFormData.programEndDate === etFormData.programEndDate
  };

  console.log('  App Start Date Match:', matches.appStartDate, `(${editFormData.applicationStartDate} === ${etFormData.applicationStartDate})`);
  console.log('  App Start Time Match:', matches.appStartTime, `(${editFormData.applicationStartTime} === ${etFormData.applicationStartTime})`);
  console.log('  App End Date Match:', matches.appEndDate, `(${editFormData.applicationEndDate} === ${etFormData.applicationEndDate})`);
  console.log('  App End Time Match:', matches.appEndTime, `(${editFormData.applicationEndTime} === ${etFormData.applicationEndTime})`);
  console.log('  Program Start Date Match:', matches.progStartDate, `(${editFormData.programStartDate} === ${etFormData.programStartDate})`);
  console.log('  Program End Date Match:', matches.progEndDate, `(${editFormData.programEndDate} === ${etFormData.programEndDate})`);

  // Test saving changes (round-trip back to UTC)
  console.log('\n🔄 STEP 7: Testing save changes (convert ET back to UTC)...');
  const updatedAppStartUTC = converter.convertETToUTC(editFormData.applicationStartDate, editFormData.applicationStartTime);
  const updatedAppEndUTC = converter.convertETToUTC(editFormData.applicationEndDate, editFormData.applicationEndTime);
  const updatedProgStartUTC = converter.convertETDateToUTC(editFormData.programStartDate);
  const updatedProgEndUTC = converter.convertETDateToUTC(editFormData.programEndDate);

  console.log('  Updated App Start UTC:', updatedAppStartUTC.toISOString());
  console.log('  Updated App End UTC:', updatedAppEndUTC.toISOString());
  console.log('  Updated Program Start UTC:', updatedProgStartUTC.toISOString());
  console.log('  Updated Program End UTC:', updatedProgEndUTC.toISOString());

  // Check if UTC timestamps match original (should be identical if no changes made)
  const utcMatches = {
    appStart: Math.abs(updatedAppStartUTC.getTime() - applicationStartUTC.getTime()) < 1000,
    appEnd: Math.abs(updatedAppEndUTC.getTime() - applicationEndUTC.getTime()) < 1000,
    progStart: Math.abs(updatedProgStartUTC.getTime() - programStartUTC.getTime()) < 1000,
    progEnd: Math.abs(updatedProgEndUTC.getTime() - programEndUTC.getTime()) < 1000
  };

  console.log('\n✅ STEP 8: Verifying UTC round-trip accuracy...');
  console.log('  App Start UTC Match:', utcMatches.appStart);
  console.log('  App End UTC Match:', utcMatches.appEnd);
  console.log('  Program Start UTC Match:', utcMatches.progStart);
  console.log('  Program End UTC Match:', utcMatches.progEnd);

  // Update database with "edited" data
  await db.updateCohort(savedCohort.id, {
    applicationStartDate: updatedAppStartUTC,
    applicationEndDate: updatedAppEndUTC,
    programStartDate: updatedProgStartUTC,
    programEndDate: updatedProgEndUTC
  });

  // Final verification
  const allETMatches = Object.values(matches).every(match => match);
  const allUTCMatches = Object.values(utcMatches).every(match => match);

  console.log('\n🎯 FINAL RESULTS:');
  console.log('  ✅ ET Round-trip Successful:', allETMatches);
  console.log('  ✅ UTC Round-trip Successful:', allUTCMatches);
  console.log('  ✅ Overall Test Status:', allETMatches && allUTCMatches ? 'PASSED' : 'FAILED');

  if (allETMatches && allUTCMatches) {
    console.log('\n🎉 TIMEZONE CONVERSION TEST PASSED! 🎉');
  } else {
    console.log('\n❌ TIMEZONE CONVERSION TEST FAILED!');
    process.exit(1);
  }

  // Bonus: Test DST handling
  console.log('\n🌅 BONUS: Testing DST transitions...');
  
  const estDate = new Date('2025-01-15T12:00:00.000Z');
  const edtDate = new Date('2025-07-15T12:00:00.000Z');
  
  console.log('  EST Period (Jan):', converter.getETOffset(estDate));
  console.log('  EDT Period (Jul):', converter.getETOffset(edtDate));
  
  console.log('\n🧪 === TIMEZONE TEST COMPLETED ===\n');
}

// Run the test
runTimezoneTest().catch(error => {
  console.error('❌ Test failed with error:', error);
  process.exit(1);
});