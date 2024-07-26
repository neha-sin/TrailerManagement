import './assets/main.css'
import { Amplify } from 'aws-amplify';
import awsExports from './aws-exports';

import { createApp } from 'vue'
import App from './App.vue'

Amplify.configure(awsExports);

createApp(App).mount('#app')
