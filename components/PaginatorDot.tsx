import React from "react";
import { Dimensions, StyleSheet } from "react-native";
import Animated, {
    Extrapolation,
    interpolate,
    SharedValue,
    useAnimatedStyle,
} from "react-native-reanimated";

const { width } = Dimensions.get("window");

type Props = {
  index: number;
  scrollX: SharedValue<number>;
};

export default function PaginatorDot({ index, scrollX }: Props) {
  const animatedDotStyle = useAnimatedStyle(() => {
    // Expand width for the active dot
    const dotWidth = interpolate(
      scrollX.value,
      [(index - 1) * width, index * width, (index + 1) * width],
      [8, 24, 8],
      Extrapolation.CLAMP,
    );

    // Fade inactive dots
    const opacity = interpolate(
      scrollX.value,
      [(index - 1) * width, index * width, (index + 1) * width],
      [0.3, 1, 0.3],
      Extrapolation.CLAMP,
    );

    return {
      width: dotWidth,
      opacity,
    };
  });

  return <Animated.View style={[styles.indicator, animatedDotStyle]} />;
}

const styles = StyleSheet.create({
  indicator: {
    height: 8,
    backgroundColor: "#000", // Black dots
    marginHorizontal: 4,
    borderRadius: 4,
  },
});
