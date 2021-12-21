<template>
  <div class="home">
    <h1>Current Temperature</h1>
    <span class="temp">{{tempF}}&deg;F</span>
  </div>
</template>

<script>
// @ is an alias to /src

import {ServerFacade} from "../scripts/serverfacade.js";
import {Utils} from "../scripts/utils.js";

export default {
  name: 'Home',
  meta: {
    title: "Wovyn Sensor Web App"
  },
  data: () => {
    return {
      tempF: 0,
    }
  },
  mounted() {
    Utils.setPageTitle("Current Temperature");
  },
  created() {
    this.getCurrentTemp();
  },
  methods: {
    getCurrentTemp: async function() {
      let res = await new ServerFacade().callFunction("temperature_store", "current_temp");
      this.tempF = res.data;
    }
  }
}
</script>

<style>
.temp {
  font-size: 6rem;
}
</style>
