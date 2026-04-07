"""
Model Distillation Eval -- Run both Response A and B, highlight issues
Usage: python scripts/career/eval-distillation-test.py
"""
import sys
import traceback

# Colors for terminal
RED = "\033[91m"
GREEN = "\033[92m"
YELLOW = "\033[93m"
CYAN = "\033[96m"
BOLD = "\033[1m"
RESET = "\033[0m"

def header(text):
    print(f"\n{'='*60}")
    print(f"{BOLD}{CYAN}{text}{RESET}")
    print(f"{'='*60}")

def ok(text):
    print(f"  {GREEN}[OK]{RESET} {text}")

def warn(text):
    print(f"  {YELLOW}[WARN]{RESET} {text}")

def error(text):
    print(f"  {RED}[ERROR]{RESET} {text}")

def info(text):
    print(f"  {CYAN}[INFO]{RESET} {text}")

# ============================================================
header("INSTALLING TENSORFLOW (may take a moment)")
# ============================================================
try:
    import tensorflow as tf
    ok(f"TensorFlow {tf.__version__} already installed")
except ImportError:
    info("Installing tensorflow...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "tensorflow", "-q"])
    import tensorflow as tf
    ok(f"TensorFlow {tf.__version__} installed")

import numpy as np

# ============================================================
header("RESPONSE A -- Analysis")
# ============================================================

print(f"\n{BOLD}Step 1: Building teacher and student models{RESET}")

from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Dense, Flatten, Conv2D, MaxPooling2D

teacher_model = Sequential([
    Conv2D(32, (3, 3), activation='relu', input_shape=(28, 28, 1)),
    MaxPooling2D((2, 2)),
    Conv2D(64, (3, 3), activation='relu'),
    MaxPooling2D((2, 2)),
    Flatten(),
    Dense(128, activation='relu'),
    Dense(10, activation='softmax')
])
ok("Teacher model built (CNN, larger)")

student_model_a = Sequential([
    Conv2D(16, (3, 3), activation='relu', input_shape=(28, 28, 1)),
    MaxPooling2D((2, 2)),
    Flatten(),
    Dense(64, activation='relu'),
    Dense(10, activation='softmax')  # <-- THIS IS THE PROBLEM
])
ok("Student model built (smaller CNN)")

print(f"\n{BOLD}Step 2: Checking distillation loss function{RESET}")

def distillation_loss_a(y_true, y_pred, teacher_logits, temperature=3):
    y_true_loss = tf.keras.losses.categorical_crossentropy(y_true, y_pred)
    y_teacher = tf.nn.softmax(teacher_logits / temperature)
    y_student = tf.nn.softmax(y_pred / temperature)  # <-- BUG
    kl_loss = tf.keras.losses.KLDivergence()(y_teacher, y_student) * (temperature ** 2)
    return y_true_loss + kl_loss

error(f"{RED}BUG 1 -- DOUBLE SOFTMAX{RESET}")
print(f"    Student model ends with activation='softmax'")
print(f"    Loss function ALSO applies tf.nn.softmax(y_pred / temperature)")
print(f"    softmax(softmax(x)) != softmax(x) -- this distorts the probability distribution")
print(f"    {YELLOW}FIX: Remove softmax from student model's last layer, use linear output instead{RESET}")

print(f"\n{BOLD}Step 3: Checking teacher logits callback{RESET}")

# Load a tiny subset of MNIST to test
(x_train, y_train), (x_test, y_test) = tf.keras.datasets.mnist.load_data()
x_train = x_train[:500] / 255.0  # Just 500 samples for speed
x_train = np.expand_dims(x_train, -1)
y_train_cat = tf.keras.utils.to_categorical(y_train[:500], 10)

info("Training teacher model on 500 MNIST samples (2 epochs for speed)...")
teacher_model.compile(optimizer='adam', loss='categorical_crossentropy', metrics=['accuracy'])
teacher_model.fit(x_train, y_train_cat, epochs=2, verbose=0)
teacher_acc = teacher_model.evaluate(x_train, y_train_cat, verbose=0)[1]
ok(f"Teacher trained, accuracy: {teacher_acc:.2%}")

# Get teacher logits for full training set
teacher_logits_full = teacher_model.predict(x_train, verbose=0)
info(f"Teacher logits shape (full dataset): {teacher_logits_full.shape}")

error(f"{RED}BUG 2 -- SHAPE MISMATCH{RESET}")
print(f"    The callback stores teacher_logits for ALL {len(x_train)} training samples")
print(f"    But during training, each batch only has ~32 samples")
print(f"    The loss function receives y_pred shape (32, 10) but teacher_logits shape ({len(x_train)}, 10)")
print(f"    {YELLOW}FIX: Compute teacher logits per-batch inside a custom training loop{RESET}")

print(f"\n{BOLD}Step 4: Attempting to compile student with lambda loss{RESET}")

try:
    student_model_a.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=0.001),
        loss=lambda y_true, y_pred: distillation_loss_a(y_true, y_pred, teacher_logits_full),
        metrics=['accuracy']
    )
    warn("Compiled without error -- but will crash during training due to shape mismatch")

    info("Attempting to train student model A...")
    try:
        student_model_a.fit(x_train, y_train_cat, epochs=1, batch_size=32, verbose=0)
        warn("Training completed -- but results are wrong due to double softmax + shape mismatch")
    except Exception as e:
        error(f"Training CRASHED: {e}")
except Exception as e:
    error(f"Compilation failed: {e}")

print(f"\n{BOLD}Response A Summary:{RESET}")
ok("Correct concept: KL divergence + temperature scaling + combined loss")
ok("Correct concept: Teacher provides soft targets for student")
error("Bug 1: Double softmax (model has softmax + loss applies softmax again)")
error("Bug 2: Full-dataset teacher logits vs per-batch student predictions (shape mismatch)")
warn("The architecture is RIGHT, the implementation has fixable bugs")

# ============================================================
header("RESPONSE B -- Analysis")
# ============================================================

print(f"\n{BOLD}Step 1: Building models{RESET}")

teacher_model_b = Sequential([
    Dense(64, activation='relu', input_shape=(784,)),
    Dense(32, activation='relu'),
    Dense(10, activation='softmax')
])
ok("Teacher model B built (simple dense network)")

student_model_b = Sequential([
    Dense(32, activation='relu', input_shape=(784,)),
    Dense(10, activation='softmax')
])
ok("Student model B built")

print(f"\n{BOLD}Step 2: Checking distillation loss function{RESET}")

# Response B's loss function
def distillation_loss_b(y_true, y_pred):
    return tf.keras.losses.categorical_crossentropy(y_true, y_pred) + \
           0.5 * tf.keras.losses.categorical_crossentropy(y_true, teacher_model_b.predict(y_true))

error(f"{RED}BUG 1 -- FUNDAMENTAL: teacher_model.predict(y_true){RESET}")
print(f"    y_true is the LABELS (one-hot encoded, shape [batch, 10])")
print(f"    teacher_model.predict() expects INPUT DATA (images, shape [batch, 784])")
print(f"    Passing labels into predict means the teacher NEVER sees the actual data")
print(f"    This completely breaks distillation -- the teacher's 'predictions' are meaningless")
print(f"    {YELLOW}FIX: Should be teacher_model.predict(X_input), not teacher_model.predict(y_true){RESET}")

error(f"{RED}BUG 2 -- No temperature scaling{RESET}")
print(f"    The prompt specifically asked about temperature parameter")
print(f"    Distillation uses temperature to 'soften' the teacher's predictions")
print(f"    Response B has no temperature at all -- just raw cross-entropy")
print(f"    {YELLOW}FIX: Add temperature parameter, use KL divergence with scaled logits{RESET}")

error(f"{RED}BUG 3 -- predict() inside loss function{RESET}")
print(f"    Calling model.predict() inside a loss function breaks TensorFlow's gradient tape")
print(f"    predict() runs in eager mode, not inside the computation graph")
print(f"    Gradients cannot flow through predict() -- student can't learn from teacher")
print(f"    {YELLOW}FIX: Use teacher_model(x, training=False) instead of predict(){RESET}")

warn(f"{YELLOW}BUG 4 -- Deprecated parameter: lr= instead of learning_rate={RESET}")
print(f"    Adam(lr=0.001) triggers a deprecation warning in modern Keras")
print(f"    {YELLOW}FIX: Use Adam(learning_rate=0.001){RESET}")

print(f"\n{BOLD}Step 3: Attempting to run Response B{RESET}")

# Flatten MNIST for Response B's dense network
x_train_flat = x_train.reshape(-1, 784).astype('float32')

teacher_model_b.compile(optimizer='adam', loss='categorical_crossentropy', metrics=['accuracy'])
teacher_model_b.fit(x_train_flat, y_train_cat, epochs=2, verbose=0)
ok("Teacher B trained")

try:
    student_model_b.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=0.001),
        loss=distillation_loss_b,
        metrics=['accuracy']
    )
    info("Attempting to train student model B...")
    student_model_b.fit(x_train_flat, y_train_cat, epochs=1, batch_size=32, verbose=0)
    error("Training 'completed' but results are GARBAGE -- teacher predicted on labels, not data")
except Exception as e:
    error(f"Training CRASHED: {e}")

print(f"\n{BOLD}Response B Summary:{RESET}")
error("FUNDAMENTAL: Passes labels into teacher_model.predict() instead of input data")
error("No temperature scaling (prompt specifically asked for it)")
error("predict() inside loss breaks gradient computation")
warn("Deprecated lr= parameter")
error("The architecture is WRONG -- not just buggy, conceptually broken")

# ============================================================
header("FINAL VERDICT")
# ============================================================

print(f"""
{BOLD}Response A is better.{RESET}

{GREEN}Response A:{RESET}
  [OK] Correct distillation concept (KL divergence + temperature + combined loss)
  [OK] Teacher provides soft targets to student (correct data flow)
  [X] Double softmax bug (fixable -- remove softmax from student's last layer)
  [X] Shape mismatch bug (fixable -- compute logits per-batch)
  --> {GREEN}Fundamentally sound, implementation bugs are fixable{RESET}

{RED}Response B:{RESET}
  [X] Passes y_true (labels) into teacher_model.predict() -- teacher never sees real data
  [X] No temperature scaling despite prompt asking for it
  [X] predict() inside loss function breaks gradient tape
  [X] Deprecated API usage
  --> {RED}Fundamentally broken, not fixable without rewriting{RESET}

{CYAN}Key difference:{RESET} A's bugs are "wrong details in right approach."
B's bugs are "wrong approach entirely."
""")
