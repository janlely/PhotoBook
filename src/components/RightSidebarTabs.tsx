import React from 'react';
import { Tab } from '@headlessui/react';
import Toolbox from './Toolbox';
import PropertiesPanel from './PropertiesPanel';
import CanvasSettingsPanel from './CanvasSettingsPanel';

const RightSidebarTabs: React.FC = () => (
  <div className="w-64 bg-white border-l border-gray-200 flex flex-col h-full">
    <Tab.Group>
      <Tab.List className="flex p-1 bg-gray-100">
        <Tab className={({ selected }) => 
          `flex-1 py-2 px-4 text-sm font-medium transition-colors
           ${selected 
             ? 'bg-white text-blue-600 shadow-sm' 
             : 'text-gray-600 hover:bg-gray-200'}`
        }>
          设计工具
        </Tab>
        <Tab className={({ selected }) => 
          `flex-1 py-2 px-4 text-sm font-medium transition-colors
           ${selected 
             ? 'bg-white text-blue-600 shadow-sm' 
             : 'text-gray-600 hover:bg-gray-200'}`
        }>
          元素属性
        </Tab>
        <Tab className={({ selected }) => 
          `flex-1 py-2 px-4 text-sm font-medium transition-colors
           ${selected 
             ? 'bg-white text-blue-600 shadow-sm' 
             : 'text-gray-600 hover:bg-gray-200'}`
        }>
          画布设置
        </Tab>
      </Tab.List>
      <Tab.Panels className="flex-1 overflow-auto">
        <Tab.Panel className="h-full p-2">
          <Toolbox />
        </Tab.Panel>
        <Tab.Panel className="h-full">
          <PropertiesPanel />
        </Tab.Panel>
        <Tab.Panel className="h-full p-4">
          <CanvasSettingsPanel />
        </Tab.Panel>
      </Tab.Panels>
    </Tab.Group>
  </div>
);

export default RightSidebarTabs;
