<template>
  <div class="home">
    <h1>Recent Violations</h1>
    <div class="tempslist" v-if="temps.length">
      <span class="temp-item" v-for="temp in temps" :key="temp">{{temp.timestamp}}: {{temp.temperature}}&deg;F</span>
    </div>

    <div v-else>No data to display.</div>
  </div>
</template>

<script>
// @ is an alias to /src

import {ServerFacade} from "../scripts/serverfacade.js";
import {Utils} from "../scripts/utils.js";

export default {
  name: 'RecentViolations',
  data: () => {
    return {
      temps: [],
    }
  },
  mounted() {
    Utils.setPageTitle("Violations");
  },
  created() {
    this.getRecentViolations();
  },
  methods: {
    getRecentViolations: async function() {
      this.temps = await new ServerFacade().getListOfTemps("temperature_store", "threshold_violations");
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
</style>
