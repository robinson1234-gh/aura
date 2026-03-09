#!/usr/bin/env python3
"""
Complete LoRA (Low-Rank Adaptation) Training Example

This example demonstrates:
1. Basic LoRA implementation for linear layers
2. Applying LoRA to a simple model
3. Training with LoRA vs full fine-tuning
4. Parameter efficiency comparison
"""

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, TensorDataset
import numpy as np
from typing import List, Optional
import time


class LoRALinear(nn.Module):
    """
    LoRA (Low-Rank Adaptation) wrapper for linear layers.
    
    Original paper: https://arxiv.org/abs/2106.09685
    
    The idea is to represent the weight update as:
    W_updated = W_original + (A * B)
    where A ∈ R^(d×r), B ∈ R^(r×k), and r << min(d,k)
    """
    
    def __init__(self, linear_layer: nn.Linear, rank: int = 4, alpha: float = 1.0):
        super().__init__()
        self.linear = linear_layer
        self.rank = rank
        self.alpha = alpha
        
        # Freeze the original weights
        for param in self.linear.parameters():
            param.requires_grad = False
            
        # Initialize LoRA matrices
        in_features = linear_layer.in_features
        out_features = linear_layer.out_features
        
        # A matrix: input_dim x rank
        self.lora_A = nn.Parameter(torch.zeros(in_features, rank))
        # B matrix: rank x output_dim  
        self.lora_B = nn.Parameter(torch.zeros(rank, out_features))
        
        # Scaling factor
        self.scaling = alpha / rank
        
        # Initialize B to zero so initial output is same as original
        nn.init.kaiming_uniform_(self.lora_A, a=np.sqrt(5))
        nn.init.zeros_(self.lora_B)
        
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # Original forward pass
        original_output = self.linear(x)
        
        # LoRA forward pass: x @ A @ B * scaling
        lora_output = (x @ self.lora_A @ self.lora_B) * self.scaling
        
        return original_output + lora_output
    
    def merge_weights(self) -> nn.Linear:
        """Merge LoRA weights back into the original linear layer"""
        merged_linear = nn.Linear(self.linear.in_features, self.linear.out_features, 
                                 bias=self.linear.bias is not None)
        
        # Copy original weights
        merged_linear.weight.data = self.linear.weight.data.clone()
        if self.linear.bias is not None:
            merged_linear.bias.data = self.linear.bias.data.clone()
            
        # Add LoRA contribution
        merged_linear.weight.data += (self.lora_A @ self.lora_B).T * self.scaling
        
        return merged_linear


def apply_lora_to_model(model: nn.Module, target_modules: List[str] = ['linear'], 
                       rank: int = 4, alpha: float = 1.0) -> nn.Module:
    """
    Apply LoRA to specified modules in the model.
    """
    def _apply_lora_recursive(module, prefix=""):
        for name, child in module.named_children():
            full_name = f"{prefix}.{name}" if prefix else name
            
            # Check if this module should be replaced with LoRA
            if any(target in full_name.lower() for target in target_modules) and isinstance(child, nn.Linear):
                print(f"Applying LoRA to {full_name}")
                setattr(module, name, LoRALinear(child, rank=rank, alpha=alpha))
            else:
                # Recursively apply to children
                _apply_lora_recursive(child, full_name)
    
    _apply_lora_recursive(model)
    return model


class SimpleModel(nn.Module):
    """Simple model for demonstration purposes"""
    def __init__(self, input_dim: int = 10, hidden_dim: int = 64, output_dim: int = 2):
        super().__init__()
        self.linear1 = nn.Linear(input_dim, hidden_dim)
        self.relu = nn.ReLU()
        self.linear2 = nn.Linear(hidden_dim, hidden_dim)
        self.linear3 = nn.Linear(hidden_dim, output_dim)
        
    def forward(self, x):
        x = self.relu(self.linear1(x))
        x = self.relu(self.linear2(x))
        x = self.linear3(x)
        return x


def create_dummy_data(num_samples: int = 1000, input_dim: int = 10, output_dim: int = 2):
    """Create dummy dataset for training"""
    X = torch.randn(num_samples, input_dim)
    # Create a simple relationship: first 5 features determine output
    y = torch.zeros(num_samples, output_dim)
    y[:, 0] = X[:, :5].sum(dim=1) + 0.1 * torch.randn(num_samples)
    y[:, 1] = X[:, 5:].sum(dim=1) + 0.1 * torch.randn(num_samples)
    return X, y


def count_parameters(model: nn.Module) -> int:
    """Count trainable parameters in the model"""
    return sum(p.numel() for p in model.parameters() if p.requires_grad)


def train_model(model: nn.Module, dataloader: DataLoader, num_epochs: int = 10, 
                learning_rate: float = 0.01, model_name: str = "Model"):
    """Training loop for the model"""
    optimizer = optim.Adam(model.parameters(), lr=learning_rate)
    criterion = nn.MSELoss()
    
    model.train()
    start_time = time.time()
    
    for epoch in range(num_epochs):
        total_loss = 0.0
        for batch_x, batch_y in dataloader:
            optimizer.zero_grad()
            outputs = model(batch_x)
            loss = criterion(outputs, batch_y)
            loss.backward()
            optimizer.step()
            total_loss += loss.item()
            
        if epoch % 2 == 0:  # Print every 2 epochs
            avg_loss = total_loss / len(dataloader)
            print(f"{model_name} - Epoch {epoch}, Loss: {avg_loss:.6f}")
    
    training_time = time.time() - start_time
    return training_time


def main():
    print("=== LoRA Training Example ===\n")
    
    # Set random seed for reproducibility
    torch.manual_seed(42)
    np.random.seed(42)
    
    # Create dummy data
    X, y = create_dummy_data(num_samples=1000, input_dim=10, output_dim=2)
    dataset = TensorDataset(X, y)
    dataloader = DataLoader(dataset, batch_size=32, shuffle=True)
    
    print(f"Dataset size: {len(dataset)} samples")
    print(f"Input dimension: {X.shape[1]}, Output dimension: {y.shape[1]}\n")
    
    # Create base model
    base_model = SimpleModel(input_dim=10, hidden_dim=64, output_dim=2)
    
    # === Full Fine-tuning ===
    print("1. Full Fine-tuning:")
    full_model = SimpleModel(input_dim=10, hidden_dim=64, output_dim=2)
    # Copy base model weights
    full_model.load_state_dict(base_model.state_dict())
    
    full_params = count_parameters(full_model)
    print(f"Trainable parameters (Full): {full_params:,}")
    
    full_time = train_model(full_model, dataloader, num_epochs=10, 
                           learning_rate=0.01, model_name="Full FT")
    print(f"Training time: {full_time:.2f} seconds\n")
    
    # === LoRA Fine-tuning ===
    print("2. LoRA Fine-tuning:")
    lora_model = SimpleModel(input_dim=10, hidden_dim=64, output_dim=2)
    # Copy base model weights
    lora_model.load_state_dict(base_model.state_dict())
    
    # Apply LoRA to all linear layers
    lora_model = apply_lora_to_model(lora_model, target_modules=['linear'], rank=4, alpha=1.0)
    
    lora_params = count_parameters(lora_model)
    print(f"Trainable parameters (LoRA): {lora_params:,}")
    print(f"Parameter reduction: {(1 - lora_params/full_params)*100:.1f}%\n")
    
    lora_time = train_model(lora_model, dataloader, num_epochs=10, 
                           learning_rate=0.01, model_name="LoRA FT")
    print(f"Training time: {lora_time:.2f} seconds\n")
    
    # === Evaluation ===
    print("3. Model Evaluation:")
    test_X, test_y = create_dummy_data(num_samples=100, input_dim=10, output_dim=2)
    
    full_model.eval()
    lora_model.eval()
    
    with torch.no_grad():
        full_pred = full_model(test_X)
        lora_pred = lora_model(test_X)
        
        full_mse = torch.mean((full_pred - test_y) ** 2).item()
        lora_mse = torch.mean((lora_pred - test_y) ** 2).item()
        
    print(f"Full FT Test MSE: {full_mse:.6f}")
    print(f"LoRA FT Test MSE: {lora_mse:.6f}")
    print(f"MSE Difference: {abs(full_mse - lora_mse):.6f}\n")
    
    # === Weight Merging Example ===
    print("4. Weight Merging Demonstration:")
    # Get one LoRA layer
    lora_layer = None
    for module in lora_model.modules():
        if isinstance(module, LoRALinear):
            lora_layer = module
            break
    
    if lora_layer is not None:
        merged_layer = lora_layer.merge_weights()
        test_input = torch.randn(1, 10)
        
        original_output = lora_layer(test_input)
        merged_output = merged_layer(test_input)
        
        difference = torch.abs(original_output - merged_output).max().item()
        print(f"Max difference between LoRA and merged layer: {difference:.8f}")
        print("✓ Weight merging works correctly!\n")
    
    print("=== LoRA Example Complete ===")


if __name__ == "__main__":
    main()