<template>
  <div class="home">
    <h1>Sensor Config</h1>
    <div class="form">

        <span>Name:</span>
        <input type="text" v-model="name">

        <span>Location:</span>
        <input type="text" v-model="location">

        <span>Phone:</span>
        <input type="text" v-model="phone">

        <span>Threshold:</span>
        <input type="text" v-model="threshold">

    </div>

    <button @click.prevent="updateConfig()">Update Config</button>
    <button @click.prevent="clearLogs()">Clear Logs</button>
  </div>
</template>

<script>
// @ is an alias to /src

import {ServerFacade} from "../scripts/serverfacade.js";
import {Utils} from "../scripts/utils.js";

export default {
  name: 'SensorConfig',
  data: () => {
    return {
      name: "",
      location: "",
      phone: "",
      threshold: 0,
    }
  },
  mounted() {
    Utils.setPageTitle("Config");
  },
  created() {
    this.getCurrentConfig();
  },
  methods: {
    getCurrentConfig: async function() {
      let res = await new ServerFacade().callFunction("sensor_profile", "get_profile");
      this.name = res.data.name;
      this.location = res.data.location;
      this.phone = res.data.notification_recipient;
      this.threshold = res.data.temperature_threshold;
    },

    updateConfig: async function() {
      let args = {
        "name": this.name,
        "location": this.location,
        "temperature_threshold": this.threshold,
        "notification_recipient": this.phone
      }

      await new ServerFacade().raiseEvent("sensor", "profile_updated", args);

      this.getCurrentConfig();
    },

    clearLogs: async function() {
      await new ServerFacade().raiseEvent("sensor", "reading_reset");
    }
  }
}
</script>

<style>
.tempslist {
  display: flex;
  flex-direction: column;
}
.temp-item {
  font-size: 2rem;
}

.temp-item:not(:last-child) {
  border-bottom: 1px solid #ebebeb;
}

.form {
  display: grid;
  grid-gap: 1rem;
  grid-template: auto / auto 1fr;
  padding: 1rem;
}
</style>
