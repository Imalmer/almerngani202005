import { configureStore, createSlice, nanoid } from "@reduxjs/toolkit";
import * as Haptics from "expo-haptics";
import { useMemo, useState } from "react";
import {
  FlatList,
  SafeAreaView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import {
  Appbar,
  Avatar,
  Button,
  Card,
  Divider,
  MD3DarkTheme,
  MD3LightTheme,
  Provider as PaperProvider,
  Switch,
  Text,
  TextInput,
} from "react-native-paper";
import { Provider as ReduxProvider, useDispatch, useSelector } from "react-redux";

/********************
 * Redux setup: ui and todos only
 ********************/

const uiSlice = createSlice({
  name: "ui",
  initialState: { darkMode: false },
  reducers: {
    toggleDarkMode(state) {
      state.darkMode = !state.darkMode;
    },
  },
});

const todosSlice = createSlice({
  name: "todos",
  initialState: { items: [] },
  reducers: {
    addTodo: {
      reducer(state, action) {
        state.items.unshift(action.payload);
      },
      prepare(title) {
        return { payload: { id: nanoid(), title, done: false, createdAt: Date.now() } };
      },
    },
    toggleTodo(state, action) {
      const todo = state.items.find((t) => t.id === action.payload);
      if (todo) todo.done = !todo.done;
    },
    removeTodo(state, action) {
      state.items = state.items.filter((t) => t.id !== action.payload);
    },
    clearTodos(state) {
      state.items = [];
    },
  },
});

const { toggleDarkMode } = uiSlice.actions;
const { addTodo, toggleTodo, removeTodo, clearTodos } = todosSlice.actions;

const store = configureStore({
  reducer: {
    ui: uiSlice.reducer,
    todos: todosSlice.reducer,
  },
});

/********************
 * App Root
 ********************/

export default function App() {
  return (
    <ReduxProvider store={store}>
      <ThemedApp />
    </ReduxProvider>
  );
}

function ThemedApp() {
  const darkMode = useSelector((s) => s.ui.darkMode);
  const theme = useMemo(() => (darkMode ? MD3DarkTheme : MD3LightTheme), [darkMode]);
  return (
    <PaperProvider theme={theme}>
      <SafeAreaView style={{ flex: 1 }}>
        <AppScaffold />
      </SafeAreaView>
    </PaperProvider>
  );
}

/********************
 * Main Scaffold
 ********************/

function AppScaffold() {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  return (
    <View style={[styles.container, isTablet && styles.containerTablet]}>
      <Appbar.Header>
        <Appbar.Content title="StateRedux" />
        <DarkModeSwitch />
      </Appbar.Header>

      <View style={[styles.content, isTablet && styles.contentTablet]}>
        <TodosCard />
      </View>
    </View>
  );
}

function DarkModeSwitch() {
  const dispatch = useDispatch();
  const darkMode = useSelector((s) => s.ui.darkMode);
  return (
    <View style={{ flexDirection: "row", alignItems: "center", paddingRight: 12 }}>
      <Text style={{ marginRight: 8 }}>{darkMode ? "Dark" : "Light"}</Text>
      <Switch
        value={darkMode}
        onValueChange={() => dispatch(toggleDarkMode())}
        accessibilityLabel="Toggle dark mode"
      />
    </View>
  );
}

/********************
 * Todos with banner on add
 ********************/


function TodosCard() {
  const dispatch = useDispatch();
  const items = useSelector((s) => s.todos.items);
  const darkMode = useSelector((s) => s.ui.darkMode);  // get dark mode state
  const [title, setTitle] = useState("");
  const { width } = useWindowDimensions();
  const numColumns = width >= 900 ? 2 : 1;

  // Banner state
  const [bannerVisible, setBannerVisible] = useState(false);
  const [bannerMessage, setBannerMessage] = useState("");
  const [lastTodo, setLastTodo] = useState(null);
  const [lastAction, setLastAction] = useState(null); // "add" or "done"

  // Separate undone and done todos
  const undoneTodos = items.filter((todo) => !todo.done);
  const doneTodos = items.filter((todo) => todo.done);

  // Colors for Done section based on dark mode
  const doneCardBackground = darkMode ? "#333" : "#4c00ffff"; // dark gray or light gray
  const doneTextColor = darkMode ? "#eee" : "#000";          // light text or black text

  // Show banner with message and set last todo & action
  const showBanner = (message, todo, action) => {
    setBannerMessage(message);
    setLastTodo(todo);
    setLastAction(action);
    setBannerVisible(true);

    // Auto-hide after 3 sec
    setTimeout(() => {
      setBannerVisible(false);
      setLastTodo(null);
      setLastAction(null);
      setBannerMessage("");
    }, 3000);
  };

  // Add todo handler
  const handleAddTodo = () => {
    if (!title.trim()) return;
    const newTodo = { id: nanoid(), title: title.trim(), done: false, createdAt: Date.now() };
    dispatch(addTodo(newTodo.title));
    setTitle("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    showBanner(`Added: "${newTodo.title}"`, newTodo, "add");
  };

  // Done / Undo done handler
  const handleToggleDone = (todo) => {
    dispatch(toggleTodo(todo.id));

    if (!todo.done) {
      // Marking as done now
      showBanner(`Completed: "${todo.title}"`, todo, "done");
    } else {
      // Undo done (mark as undone) - optional banner
      setBannerVisible(false);
      setLastTodo(null);
      setLastAction(null);
      setBannerMessage("");
    }
  };

  // Undo handler depends on last action
  const handleUndo = () => {
    if (!lastTodo || !lastAction) return;

    if (lastAction === "add") {
      // Undo add = remove todo
      dispatch(removeTodo(lastTodo.id));
    } else if (lastAction === "done") {
      // Undo done = toggle todo back to undone
      dispatch(toggleTodo(lastTodo.id));
    }

    setBannerVisible(false);
    setLastTodo(null);
    setLastAction(null);
    setBannerMessage("");
  };

  // Dismiss banner
  const handleDismiss = () => {
    setBannerVisible(false);
    setLastTodo(null);
    setLastAction(null);
    setBannerMessage("");
  };

  return (
    <View style={{ position: "relative", marginBottom: 12 }}>
      {/* Banner */}
      {bannerVisible && lastTodo && (
        <Card style={{ backgroundColor: "#03f70bff", marginBottom: 12, padding: 8, borderRadius: 4 }} accessibilityLiveRegion="polite">
          <Text style={{ color: "white", fontWeight: "bold" }}>{bannerMessage}</Text>
          <View style={{ flexDirection: "row", marginTop: 4 }}>
            <Button onPress={handleUndo} compact textColor="white" style={{ marginRight: 12 }}>
              Undo
            </Button>
            <Button onPress={handleDismiss} compact textColor="white">
              Dismiss
            </Button>
          </View>
        </Card>
      )}

      <Card style={styles.card}>
        <Card.Title
          title="Todos (Redux list)"
          subtitle="Separate done/undone + Undo banner"
          left={(props) => <Avatar.Icon {...props} icon="check-circle-outline" />}
        />
        <Card.Content>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TextInput
              style={{ flex: 1 }}
              label="What needs doing?"
              value={title}
              onChangeText={setTitle}
              onSubmitEditing={handleAddTodo}
              returnKeyType="done"
            />
            <Button mode="contained" onPress={handleAddTodo}>
              Add
            </Button>
          </View>
          <Divider style={{ marginVertical: 12 }} />

          <Text style={{ fontWeight: "bold", marginBottom: 4 }}>To Do</Text>
          <FlatList
            data={undoneTodos}
            key={numColumns}
            numColumns={numColumns}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ gap: 8 }}
            renderItem={({ item }) => (
              <Card style={{ flex: 1, marginRight: numColumns > 1 ? 8 : 0 }}>
                <Card.Title
                  title={item.title}
                  subtitle={new Date(item.createdAt).toLocaleString()}
                  left={(props) => <Avatar.Icon {...props} icon={item.done ? "check" : "circle-outline"} />}
                />
                <Card.Actions>
                  <Button onPress={() => handleToggleDone(item)}>Done</Button>
                  <Button onPress={() => dispatch(removeTodo(item.id))} textColor="#d11">
                    Remove
                  </Button>
                </Card.Actions>
              </Card>
            )}
            ListEmptyComponent={<Text accessibilityLabel="Empty undone list">No todos yet. Add one above.</Text>}
          />

          <Divider style={{ marginVertical: 12 }} />

          <Text style={{ fontWeight: "bold", marginBottom: 4 }}>Done</Text>
          <FlatList
            data={doneTodos}
            key={numColumns + 1}
            numColumns={numColumns}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ gap: 8 }}
            renderItem={({ item }) => (
              <Card style={{ flex: 1, marginRight: numColumns > 1 ? 8 : 0, backgroundColor: doneCardBackground }}>
                <Card.Title
                  title={item.title}
                  titleStyle={{ color: doneTextColor }}
                  subtitle={new Date(item.createdAt).toLocaleString()}
                  subtitleStyle={{ color: doneTextColor }}
                  left={(props) => <Avatar.Icon {...props} icon={item.done ? "check" : "circle-outline"} />}
                />
                <Card.Actions>
                  <Button onPress={() => handleToggleDone(item)} textColor={doneTextColor}>
                    Undo
                  </Button>
                  <Button onPress={() => dispatch(removeTodo(item.id))} textColor="#d11">
                    Remove
                  </Button>
                </Card.Actions>
              </Card>
            )}
            ListEmptyComponent={<Text accessibilityLabel="Empty done list" style={{ color: doneTextColor }}>No done todos yet.</Text>}
          />

          {items.length > 0 && (
            <Button style={{ marginTop: 8 }} onPress={() => dispatch(clearTodos())}>
              Clear All
            </Button>
          )}
        </Card.Content>
      </Card>
    </View>
  );
}




/********************
 * Styles
 ********************/

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f8f8",
  },
  containerTablet: {
    flexDirection: "row",
  },
  content: {
    flex: 1,
    padding: 12,
  },
  contentTablet: {
    flexDirection: "row",
    gap: 12,
  },
  card: {
    flex: 1,
  },
  banner: {
    backgroundColor: "#4caf50",
    padding: 12,
    borderRadius: 4,
    marginHorizontal: 12,
    marginBottom: 12,
    alignItems: "center",
  },
  bannerText: {
    color: "white",
    fontWeight: "bold",
  },
});
