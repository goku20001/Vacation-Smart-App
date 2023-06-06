const SmartApp = require('@smartthings/smartapp');

const devices = [];

const getSelectedDevices = arr => {
  devices.length = 0;
  for(let item of arr){
    devices.push(item.deviceConfig.deviceId);
  }
}

const turnOnLight = async (context, deviceId) => {
  await context.api.devices.executeCommand(deviceId,
    {
      capability: "switch",
      command: "on"
    }
  );
}

const turnOffLight = async (context, deviceId) => {
  await context.api.devices.executeCommand(deviceId,
    {
      capability: "switch",
      command: "off"
    }
  );
}

const randomlySwitchLights = async context => {

  //Select a light randomly
  const n = devices.length;
  indx = Math.floor(Math.random() * n);
  const deviceId = devices[indx];
  const status = await context.api.devices.getStatus(deviceId);
  const value = status.components.main.switch.switch.value;

  //Toggle the light switch
  if(value === "off"){
    turnOnLight(context, deviceId);
  }
  else{
    turnOffLight(context, deviceId);
  }
}

const extractDayMonthYear = date => {
    let [day, month, year] = date.split('/');
    day = String(day).padStart(2,'0');
    month = String(month).padStart(2,'0');
    return [day, month, year];
}

const extractHourMinute = time => {
    const options = { timeZone: 'Asia/Kolkata', hour12: false };
    let date = new Date(time);
    let hours = date.toLocaleString('en-US', { ...options, hour: '2-digit' });
    let minutes = date.toLocaleString('en-US', { ...options, minute: '2-digit' });
    hours = String(hours).padStart(2,'0');
    minutes = String(minutes).padStart(2,'0');
    return [hours, minutes];
}


/* Define the SmartApp */
const smartApp = new SmartApp()
  .configureI18n({updateFiles: true}) // Enable translations and update translation file when new items are added.
  .enableEventLogging(2) // Logging for testing.
  .appId("my-app-id")
  .permissions([
    "r:devices:*",
    "r:locations:*",
    "x:devices:*"
  ])
  .page('mainPage', (context, page, configData) => {

    page.section('vacation', section => {
      section
        .textSetting('startDate')
        .required(true);
      section
        .textSetting('endDate')
        .required(true);
      section
        .timeSetting('startTime')
        .required(true);
      section
        .timeSetting('endTime')
        .required(true);
      section
        .deviceSetting('colorLights')
        .capabilities(['switch'])
        .permissions('rx')
        .required(true)
        .multiple(true);

    });
  })
  .updated(async (context, updateData) => {
    // Updated defines what code to run when the SmartApp is installed or the settings are updated by the user.

    // Clear any existing configuration.
    await context.api.schedules.delete()
    await context.api.subscriptions.delete();

    console.log('I am inside updated lifecycle event'.yellow);

    getSelectedDevices(context.config.colorLights);

    console.log(devices);

    const startDate = context.config.startDate[0].stringConfig.value;
    let [startDay, startMonth, startYear] = extractDayMonthYear(startDate);
    const cronExpression1 = `00 00 ${startDay} ${startMonth} ? ${startYear}`; // Schedule for midnight

    const endDate = context.config.endDate[0].stringConfig.value;
    let [endDay, endMonth, endYear] = extractDayMonthYear(endDate);
    const cronExpression2 = `59 23 ${endDay} ${endMonth} ? ${endYear}`; // Schedule for just before midnight

    // Schedules
    await context.api.schedules.schedule(
      'scheduleTimings',
      cronExpression1,
      'Asia/Kolkata'
    );

    await context.api.schedules.schedule(
      'deScheduleEverything',
      cronExpression2,
      'Asia/Kolkata'
    );
    
  })

  // For scheduling events at startTime and endTime(during which randomized lights turning on/off occurs)
  // Triggers at 00:00 AM of the first day of vacation
  .scheduledEventHandler('scheduleTimings', async (context, event) => {
    console.log("I am inside scheduleTimings".yellow);

    const startTime = context.config.startTime[0].stringConfig.value;
    const [startHour, startMinute] = extractHourMinute(startTime)
    const cronExpression1 = `${startMinute} ${startHour} * * ? *`;

    const endTime = context.config.endTime[0].stringConfig.value;
    const [endHour, endMinute] = extractHourMinute(endTime);
    const cronExpression2 = `${endMinute} ${endHour} * * ? *`;


    // Schedules
    await context.api.schedules.schedule(
      'scheduleRandomization',
      cronExpression1,
      'Asia/Kolkata'
    );

    await context.api.schedules.schedule(
      'deScheduleRandomization',
      cronExpression2,
      'Asia/Kolkata'
    );
  })


  // Triggers at 11:59 PM of the last day of vacation
  .scheduledEventHandler('deScheduleEverything', async (context, event) => {
    console.log("I am inside deScheduleEverything".yellow);
    await context.api.schedules.delete();
  })

    // Triggers at startTime every day of the vacation
  .scheduledEventHandler('scheduleRandomization', async (context, event) => {
    console.log("I am inside scheduleRandomization".yellow);
    await context.api.schedules.schedule(
      'randomizedEventScheduler',
      `0/01 * * * ? *`,
      'Asia/Kolkata'
      );
  })

    // Triggers at endTime every day of the vacation
  .scheduledEventHandler('deScheduleRandomization', async (context, event) => {
    console.log("I am inside deScheduleRandomization".yellow);
    await context.api.schedules.delete('randomizedEventScheduler');
  })

  // Triggers every minute in the time interval [startTime, endTime]
  .scheduledEventHandler('randomizedEventScheduler', async (context, event) => {
    console.log("I am inside randomizedEventScheduler".yellow);
    randomlySwitchLights(context);
  })


  module.exports = {
    smartApp, 
    turnOnLight, 
    turnOffLight, 
    extractDayMonthYear, 
    extractHourMinute
  };