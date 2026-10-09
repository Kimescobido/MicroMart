// app/index.tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useSegments } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Dimensions,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  useAnimatedScrollHandler,
  useSharedValue,
} from "react-native-reanimated";

import AnimatedSlide from "../components/AnimatedSlide";
import PaginatorDot from "../components/PaginatorDot";
import { slides } from "../constants/onboardingData";
import { useAuth } from "../src/context/AuthContext";
import type { UserRole } from "../src/services/authService";

const { width } = Dimensions.get("window");

export default function OnboardingScreen() {
  const { user, role, isLoading: isAuthLoading } = useAuth();
  const segments = useSegments();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFirstLaunch, setIsFirstLaunch] = useState<boolean | null>(null);

  const flatListRef = useRef<any>(null);
  const scrollX = useSharedValue(0);

  // 1. Check if the user has launched the app before
  useEffect(() => {
    const checkFirstLaunch = async () => {
      try {
        const hasViewedOnboarding =
          await AsyncStorage.getItem("@viewedOnboarding");
        if (hasViewedOnboarding === "true") {
          setIsFirstLaunch(false);
        } else {
          setIsFirstLaunch(true);
        }
      } catch (error) {
        console.log("Error reading AsyncStorage:", error);
        setIsFirstLaunch(true); // Default to true if storage fails
      }
    };

    checkFirstLaunch();
  }, []);

  // 2. Routing Gatekeeper Logic
  useEffect(() => {
    if (isAuthLoading || isFirstLaunch === null) return; // Wait until both checks are complete

    const inAuthGroup = segments[0] === "(auth)";

    if (user && role && !inAuthGroup) {
      const roleHome = getRoleHome(role);
      router.replace(roleHome);
    } else if (user && !role && !inAuthGroup) {
      router.replace("/(auth)");
    } else if (!user && !isFirstLaunch) {
      // Not logged in, but HAS seen onboarding before -> go straight to Login
      router.replace("/(auth)");
    }
  }, [user, role, isAuthLoading, segments, isFirstLaunch]);

  // 3. Mark Onboarding as Completed
  const completeOnboarding = async () => {
    try {
      await AsyncStorage.setItem("@viewedOnboarding", "true");
      router.replace("/(auth)");
    } catch (error) {
      console.log("Error setting AsyncStorage:", error);
    }
  };

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

  const viewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems[0]) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const goNext = () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
    } else {
      completeOnboarding();
    }
  };

  // --- RENDER SPLASH SCREEN (Shows while checking Firebase & Storage) ---
  if (isAuthLoading || isFirstLaunch === null) {
    return (
      <View style={styles.splashContainer}>
        <Text style={styles.logoText}>MicroMart</Text>
      </View>
    );
  }

  // --- RENDER ONBOARDING (Only shows for brand new unauthenticated users) ---
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerLogo}>MicroMart</Text>
      </View>

      <Animated.FlatList
        ref={flatListRef}
        data={slides}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        keyExtractor={(item) => item.id}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        onViewableItemsChanged={viewableItemsChanged}
        renderItem={({ item, index }) => (
          <AnimatedSlide item={item} index={index} scrollX={scrollX} />
        )}
      />

      <View style={styles.footer}>
        <TouchableOpacity
          onPress={completeOnboarding}
          style={styles.sideButton}
        >
          <Text style={styles.skipText}>skip</Text>
        </TouchableOpacity>

        <View style={styles.indicatorContainer}>
          {slides.map((_, index) => (
            <PaginatorDot key={index} index={index} scrollX={scrollX} />
          ))}
        </View>

        <TouchableOpacity onPress={goNext} style={styles.roundButton}>
          <Text style={styles.nextText}>
            {currentIndex === slides.length - 1 ? "✓" : ">"}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const getRoleHome = (role: UserRole) => {
  if (role === "admin") return "/(admin)/dashboard" as const;
  if (role === "delivery") return "/(delivery)/tasks" as const;
  return "/(customer)/home" as const;
};

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F3F4ED",
  },
  logoText: {
    fontSize: 32,
    fontFamily: "serif",
    color: "#000",
  },
  container: {
    flex: 1,
    backgroundColor: "#F3F4ED",
  },
  header: {
    alignItems: "center",
    marginTop: 20,
  },
  headerLogo: {
    fontSize: 20,
    fontFamily: "serif",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 30,
    paddingBottom: 40,
    height: 100,
  },
  sideButton: {
    width: 50,
  },
  skipText: {
    fontSize: 16,
    color: "#333",
  },
  indicatorContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  roundButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#D1D1D1",
    justifyContent: "center",
    alignItems: "center",
  },
  nextText: {
    fontSize: 24,
    fontWeight: "bold",
  },
});
