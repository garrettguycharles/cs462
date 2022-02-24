import {PicoFacade} from "./picoFacade.js";

class TestHarness {
    constructor(test_list) {
        this.test_list = test_list;
        this.num_tests_passed = 0;
    }

    async run() {
        for (const testFunction of this.test_list) {
            try {
                await testFunction();
                this.num_tests_passed += 1;
            } catch (e) {
                console.error("Test failed: " + testFunction.name + ": " + e);
            }
        }

        if (this.num_tests_passed === this.test_list.length) {
            console.log(`\n\nAll tests passed (${this.num_tests_passed})`);
        } else {
            console.error(`${this.test_list.length - this.num_tests_passed} tests failed.`);
        }
    }
}

const test_CreateMultipleSensors_andDeleteThem = async () => {
    const pf = new PicoFacade("cl008wm15009226p51c1vhkjl");

    const sensors_before_addition = await pf.callFunction("manage_sensors", "get_sensors");
    // console.log(sensors_before_addition);

    const num_sensors_to_add = 3;

    for (let i = 0; i < num_sensors_to_add; i++) {
        await pf.raiseEvent("sensor", "new_sensor");
    }

    const sensors_after_addition = await pf.callFunction("manage_sensors","get_sensors");
    // console.log(sensors_after_addition);

    const size_before_addition = Object.keys(sensors_before_addition).length;
    const size_after_addition = Object.keys(sensors_after_addition).length;

    if (size_after_addition != size_before_addition + num_sensors_to_add) {
        throw `Wrong size after adding three sensors. Expected: ${
            size_before_addition + num_sensors_to_add
        }, Actual: ${
            size_after_addition
        }`;
    }

    // test deletion of all sensors
    let a = new Set(Object.keys(sensors_after_addition));
    let b = new Set(Object.keys(sensors_before_addition));
    const to_delete = new Set([...a].filter(x => !b.has(x)));

    // console.log(to_delete);

    for (const name of to_delete) {
        await pf.raiseEvent("sensor", "unneeded_sensor", {
            "name": name
        });
    }

    const after_deletion = await pf.callFunction("manage_sensors","get_sensors");

    const size_after_deletion = Object.keys(after_deletion).length;

    if (size_after_deletion != size_before_addition) {
        throw `Wrong size after deleting three sensors. Expected: ${
            size_before_addition
        }, Actual: ${
            size_after_deletion
        }`;
    }
}

const test_CreateOneSensor_andEmitOneTemperatureEvent = async () => {
    const sensor_pf = new PicoFacade("cl00br7j602h926p577p8ef0b");

    const temps_before_addition = await sensor_pf.callFunction("temperature_store", "temperatures");

    console.log(temps_before_addition);

    await sensor_pf.raiseEvent("emitter", "new_sensor_reading");

    const temps_after_addition = await sensor_pf.callFunction("temperature_store", "temperatures");

    console.log(temps_after_addition);

    const size_before = Object.keys(temps_before_addition).length;
    const size_after = Object.keys(temps_after_addition).length;

    if (size_after != size_before + 1) {
        throw `Wrong size after generating one temperature. Expected: ${
            size_before + 1
        }, Actual: ${
            size_after
        }`;
    }
}

function randomStringOfLength(l) {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz ';
    let toReturn = "";
    for (let i = 0; i < l; i++) {
        toReturn += alphabet[randomInt(0, alphabet.length - 1)];
    }

    return toReturn;
}

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

const test_SetSensorProfile = async () => {
    const sensor_pf = new PicoFacade("cl00br7j602h926p577p8ef0b");

    const profile_before_change = await sensor_pf.callFunction("sensor_profile", "get_profile");
    console.log(profile_before_change);

    const new_profile = {
        "name": randomStringOfLength(10),
        "location": randomStringOfLength(10),
        "temperature_threshold": randomInt(50, 90),
        "notification_recipient": randomStringOfLength(10)
    };

    await sensor_pf.raiseEvent("sensor", "profile_updated", new_profile);

    const profile_after_change = await sensor_pf.callFunction("sensor_profile", "get_profile");

    const keys_to_check = ["name", "location", "temperature_threshold", "notification_recipient"];

    let eq = true;

    for (const key of keys_to_check) {
        if (new_profile[key] != profile_after_change[key]) {
            eq = false;
            break;
        }
    }

    if (!eq) {
        throw `Sensor profile not updated properly.  Expected: ${JSON.stringify(new_profile)} Actual: ${JSON.stringify(profile_after_change)}`;
    }
}

const tests = [
    test_CreateMultipleSensors_andDeleteThem,
    test_CreateOneSensor_andEmitOneTemperatureEvent,
    test_SetSensorProfile
];

new TestHarness(tests).run();