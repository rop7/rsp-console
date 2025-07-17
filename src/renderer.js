
const { ipcRenderer } = require('electron');


(async () => {

    new Vue({ 
    
        el:"#app",

        vuetify: new Vuetify({
            theme: { dark: true }
        }),
    
            data() {
              return {
                logs: ["Waiting..."],
                command: ""
              }
            },

            methods: {
              
                addLog() {
                
                if (this.command.trim()) {

                  this.logs.push(`> ${this.command}`);
                  this.command = "";
                
                }
              }
            },

        mounted () {

            setTimeout(() => {
              this.logs = []
            }, 3000)
                  
            ipcRenderer.on("command-log", (event, message) => {
                this.logs.push(message);
            });

            ipcRenderer.on("remove-log", (event, message) => {
                this.logs.push(message);
            });

            setInterval(() => {
              document.getElementById('logContainer').scrollTop = 9999999
            }, 100)
        },

        beforeUnmount() {
            ipcRenderer.removeAllListeners("command-log");
            ipcRenderer.removeAllListeners("remove-log");
        }
    })

})();
