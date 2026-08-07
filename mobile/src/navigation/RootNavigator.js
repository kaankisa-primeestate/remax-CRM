import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme';

import LoginScreen from '../screens/LoginScreen';
import CustomerListScreen from '../screens/CustomerListScreen';
import CustomerDetailScreen from '../screens/CustomerDetailScreen';
import CustomerFormScreen from '../screens/CustomerFormScreen';
import PropertyListScreen from '../screens/PropertyListScreen';
import PropertyDetailScreen from '../screens/PropertyDetailScreen';
import PropertyFormScreen from '../screens/PropertyFormScreen';
import AgentsScreen from '../screens/AgentsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function LogoutButton() {
  const { logout } = useAuth();
  return (
    <TouchableOpacity onPress={logout} style={{ marginLeft: 16 }}>
      <Text style={{ color: colors.brassLight, fontWeight: '600' }}>Çıkış</Text>
    </TouchableOpacity>
  );
}

// Liste ekranlarının sağ üstünde "+ Yeni" ve "Çıkış"ı birlikte gösterir
function ListHeaderRight({ onAdd }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <TouchableOpacity onPress={onAdd} style={{ marginRight: 4 }}>
        <Ionicons name="add-circle" size={28} color={colors.white} />
      </TouchableOpacity>
      <LogoutButton />
    </View>
  );
}

const baseScreenOptions = {
  headerStyle: { backgroundColor: colors.inkNavy },
  headerTintColor: colors.white,
  headerTitleStyle: { fontWeight: '700' },
};

function CustomersStack() {
  return (
    <Stack.Navigator screenOptions={baseScreenOptions}>
      <Stack.Screen
        name="CustomerList"
        component={CustomerListScreen}
        options={({ navigation }) => ({
          title: 'Müşteriler',
          headerRight: () => (
            <ListHeaderRight onAdd={() => navigation.navigate('CustomerForm')} />
          ),
        })}
      />
      <Stack.Screen
        name="CustomerDetail"
        component={CustomerDetailScreen}
        options={{ title: 'Müşteri Detayı' }}
      />
      <Stack.Screen
        name="CustomerForm"
        component={CustomerFormScreen}
        options={{ title: 'Yeni Müşteri' }}
      />
    </Stack.Navigator>
  );
}

function PropertiesStack() {
  return (
    <Stack.Navigator screenOptions={baseScreenOptions}>
      <Stack.Screen
        name="PropertyList"
        component={PropertyListScreen}
        options={({ navigation }) => ({
          title: 'Portföyler',
          headerRight: () => (
            <ListHeaderRight onAdd={() => navigation.navigate('PropertyForm')} />
          ),
        })}
      />
      <Stack.Screen
        name="PropertyDetail"
        component={PropertyDetailScreen}
        options={{ title: 'Portföy Detayı' }}
      />
      <Stack.Screen
        name="PropertyForm"
        component={PropertyFormScreen}
        options={{ title: 'Yeni Portföy' }}
      />
    </Stack.Navigator>
  );
}

function AgentsStack() {
  return (
    <Stack.Navigator screenOptions={baseScreenOptions}>
      <Stack.Screen
        name="AgentsList"
        component={AgentsScreen}
        options={{ title: 'Danışmanlar', headerRight: LogoutButton }}
      />
    </Stack.Navigator>
  );
}

function MainTabs() {
  const { isBroker } = useAuth();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.inkNavy,
        tabBarInactiveTintColor: colors.muted,
        tabBarIcon: ({ color, size }) => {
          let iconName = 'home-outline';
          if (route.name === 'MüşterilerTab') iconName = 'people-outline';
          if (route.name === 'DanışmanlarTab') iconName = 'briefcase-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="MüşterilerTab" component={CustomersStack} options={{ title: 'Müşteriler' }} />
      <Tab.Screen name="PortföylerTab" component={PropertiesStack} options={{ title: 'Portföyler' }} />
      {isBroker && (
        <Tab.Screen name="DanışmanlarTab" component={AgentsStack} options={{ title: 'Danışmanlar' }} />
      )}
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.inkNavy} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {user ? <MainTabs /> : <LoginScreen />}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.paper,
  },
});
