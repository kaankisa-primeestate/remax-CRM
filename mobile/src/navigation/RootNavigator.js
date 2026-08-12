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
import WizardCategoryScreen from '../screens/wizard/WizardCategoryScreen';
import WizardListingTypeScreen from '../screens/wizard/WizardListingTypeScreen';
import WizardDetailsScreen from '../screens/wizard/WizardDetailsScreen';
import WizardLocationScreen from '../screens/wizard/WizardLocationScreen';
import WizardPriceScreen from '../screens/wizard/WizardPriceScreen';
import WizardPhotosScreen from '../screens/wizard/WizardPhotosScreen';
import WizardPreviewScreen from '../screens/wizard/WizardPreviewScreen';
import { PropertyWizardProvider } from '../context/PropertyWizardContext';
import AgentsScreen from '../screens/AgentsScreen';
import ChangePasswordScreen from '../screens/ChangePasswordScreen';
import CommissionListScreen from '../screens/CommissionListScreen';
import CommissionFormScreen from '../screens/CommissionFormScreen';
import CommissionDetailScreen from '../screens/CommissionDetailScreen';

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

// Her ekranın sag ustunde "Sifre" butonu + Cikis butonunu birlikte gosterir
function HeaderRightWithPassword({ navigation, onAdd }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {onAdd && (
        <TouchableOpacity onPress={onAdd} style={{ marginRight: 4 }}>
          <Ionicons name="add-circle" size={28} color={colors.white} />
        </TouchableOpacity>
      )}
      <TouchableOpacity
        onPress={() => navigation.navigate('ChangePassword')}
        style={{ marginLeft: 12 }}
      >
        <Ionicons name="key-outline" size={22} color={colors.brassLight} />
      </TouchableOpacity>
      <LogoutButton />
    </View>
  );
}

function ChangePasswordStackScreen() {
  return (
    <Stack.Screen
      name="ChangePassword"
      component={ChangePasswordScreen}
      options={{ title: 'Şifre Değiştir' }}
    />
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
            <HeaderRightWithPassword navigation={navigation} onAdd={() => navigation.navigate('CustomerForm')} />
          ),
        })}
      />
      {ChangePasswordStackScreen()}
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
    <PropertyWizardProvider>
      <Stack.Navigator screenOptions={baseScreenOptions}>
        <Stack.Screen
          name="PropertyList"
          component={PropertyListScreen}
          options={({ navigation }) => ({
            title: 'Portföyler',
            headerRight: () => (
              <HeaderRightWithPassword navigation={navigation} onAdd={() => navigation.navigate('WizardListingType')} />
            ),
          })}
        />
        {ChangePasswordStackScreen()}
        <Stack.Screen
          name="PropertyDetail"
          component={PropertyDetailScreen}
          options={{ title: 'Portföy Detayı' }}
        />
        <Stack.Screen
          name="PropertyForm"
          component={PropertyFormScreen}
          options={{ title: 'Portföyü Düzenle' }}
        />
        <Stack.Screen
          name="WizardCategory"
          component={WizardCategoryScreen}
          options={{ title: 'Yeni İlan' }}
        />
        <Stack.Screen
          name="WizardListingType"
          component={WizardListingTypeScreen}
          options={{ title: 'Satılık / Kiralık' }}
        />
        <Stack.Screen
          name="WizardDetails"
          component={WizardDetailsScreen}
          options={{ title: 'Temel Bilgiler' }}
        />
        <Stack.Screen
          name="WizardLocation"
          component={WizardLocationScreen}
          options={{ title: 'Konum' }}
        />
        <Stack.Screen
          name="WizardPrice"
          component={WizardPriceScreen}
          options={{ title: 'Fiyat & Hukuki' }}
        />
        <Stack.Screen
          name="WizardPhotos"
          component={WizardPhotosScreen}
          options={{ title: 'Fotoğraflar' }}
        />
        <Stack.Screen
          name="WizardPreview"
          component={WizardPreviewScreen}
          options={{ title: 'Önizleme' }}
        />
      </Stack.Navigator>
    </PropertyWizardProvider>
  );
}

function CommissionsStack() {
  return (
    <Stack.Navigator screenOptions={baseScreenOptions}>
      <Stack.Screen
        name="CommissionList"
        component={CommissionListScreen}
        options={({ navigation }) => ({
          title: 'Komisyonlar',
          headerRight: () => (
            <HeaderRightWithPassword navigation={navigation} onAdd={() => navigation.navigate('CommissionForm')} />
          ),
        })}
      />
      {ChangePasswordStackScreen()}
      <Stack.Screen
        name="CommissionDetail"
        component={CommissionDetailScreen}
        options={{ title: 'Komisyon Detayı' }}
      />
      <Stack.Screen
        name="CommissionForm"
        component={CommissionFormScreen}
        options={{ title: 'Yeni Komisyon Kaydı' }}
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
        options={({ navigation }) => ({
          title: 'Danışmanlar',
          headerRight: () => <HeaderRightWithPassword navigation={navigation} />,
        })}
      />
      {ChangePasswordStackScreen()}
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
          if (route.name === 'KomisyonlarTab') iconName = 'cash-outline';
          if (route.name === 'DanışmanlarTab') iconName = 'briefcase-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="MüşterilerTab" component={CustomersStack} options={{ title: 'Müşteriler' }} />
      <Tab.Screen name="PortföylerTab" component={PropertiesStack} options={{ title: 'Portföyler' }} />
      <Tab.Screen name="KomisyonlarTab" component={CommissionsStack} options={{ title: 'Komisyonlar' }} />
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
