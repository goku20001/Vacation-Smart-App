const SmartApp = require('@smartthings/smartapp');

const rooms = [];

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
  //Select a room randomly
  let n = rooms.length;
  let indx = Math.floor(Math.random() * n);

  const {roomId, devices} = rooms[indx];

  //Select a light within this room randomly
  n = devices.length;
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


/* Define the SmartApp */
module.exports = new SmartApp()
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

    });
  })
  .updated(async (context, updateData) => {
    // Updated defines what code to run when the SmartApp is installed or the settings are updated by the user.
    console.log('I am inside updated lifecycle event'.yellow);

    const data = await context.api.rooms.list();

    for (const room of data) {
      const { roomId } = room;
      const devicesData = await context.api.rooms.listDevices(roomId);
      const devices = devicesData.map(item => item.deviceId);
      rooms.push({ roomId, devices });
    }

     // Clear any existing configuration.
    await context.api.schedules.delete()
    await context.api.subscriptions.delete();

    const startDate = context.config.startDate[0].stringConfig.value;

    let [startDay, startMonth, startYear] = startDate.split('/');
    startDay = String(startDay).padStart(2,'0');
    startMonth = String(startMonth).padStart(2,'0');
    const cronExpression1 = `00 00 ${startDay} ${startMonth} ? ${startYear}`; // Schedule for midnight

    const endDate = context.config.endDate[0].stringConfig.value;
    let [endDay, endMonth, endYear] = endDate.split('/');
    endDay = String(endDay).padStart(2,'0');
    endMonth = String(endMonth).padStart(2,'0');
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

    const options = { timeZone: 'Asia/Kolkata', hour12: false };

    let date = new Date(startTime);
    const startHour = date.toLocaleString('en-US', { ...options, hour: '2-digit' });
    const startMinute = date.toLocaleString('en-US', { ...options, minute: '2-digit' });
    const cronExpression1 = `${startMinute} ${startHour} * * ? *`;

    const endTime = context.config.endTime[0].stringConfig.value;
    date = new Date(endTime);
    const endHour = date.toLocaleString('en-US', { ...options, hour: '2-digit' });
    const endMinute = date.toLocaleString('en-US', { ...options, minute: '2-digit' });
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