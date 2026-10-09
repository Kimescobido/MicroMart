

export type Slide = {
  id: string;
  title: string;
  description: string;
  image: any; // 1. Add the image property to your type
};

export const slides: Slide[] = [
  {
    id: '1',
    title: 'Your Hub For Hardware',
    description: 'Everything you need to power your next embedded system, all in one place.',
    image: require('../images/first.png'), 
  },
  {
    id: '2',
    title: 'From Prototype to Production.',
    description: 'Browse a massive catalog of microcontrollers, IoT development boards, and smart sensors.',
    image: require('../images/second.png'), 
  },
  {
    id: '3',
    title: 'Build Faster!',
    description: 'Quick checkout, detailed component specs, and fast shipping so you can get back to coding.',
    image: require('../images/third.png'), 
  },
];

