import React from 'react';
import { View, Text, StyleSheet, Dimensions, Image } from 'react-native';
import Animated, { useAnimatedStyle, interpolate, Extrapolation, SharedValue } from 'react-native-reanimated';
import { Slide } from '../constants/onboardingData'; 

const { width } = Dimensions.get('window');

type Props = {
  item: Slide;
  index: number;
  scrollX: SharedValue<number>;
};

export default function AnimatedSlide({ item, index, scrollX }: Props) {
  const animatedImageStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      scrollX.value,
      [(index - 1) * width, index * width, (index + 1) * width],
      [0.6, 1, 0.6],
      Extrapolation.CLAMP
    );
    return { transform: [{ scale }] };
  });

  return (
    <View style={styles.slide}>
      {/* We will replace this gray box with your actual images later */}
      <Animated.Image 
        source={item.image} 
        style={[styles.imagePlaceholder, animatedImageStyle]} 
        resizeMode="contain" 
      />
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.description}>{item.description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  slide: {
    width,
    alignItems: 'center',
    padding: 20,
    justifyContent: 'center',
  },
  imagePlaceholder: {
    width: width - 80,
    height: 300,
    borderRadius: 20,
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontFamily: 'serif',
    color: '#000',
    textAlign: 'center',
    marginBottom: 15,
  },
  description: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 24,
  },
});